package scheduler

import (
	"context"
	"log/slog"
	"net/url"
	"strings"
	"sync"
	"time"
	"valo-mapper-api/storage"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CleanupScheduler struct {
	db                        *pgxpool.Pool
	interval                  time.Duration
	stopChan                  chan struct{}
	stopOnce                  sync.Once
	cleanupQuery              string
	subscriptionCleanupQuery  string
	deadRegistrationQuery     string
	webhookEventsCleanupQuery string
}

const deadRegistrationCleanupQuery = `
	DELETE FROM users u
	WHERE u.created_at < NOW() - INTERVAL '30 days'
	AND u.updated_at = u.created_at
	AND u.firebase_uid IS NULL
	AND u.email IS NULL
	AND COALESCE(NULLIF(TRIM(u.name), ''), '') = ''
	AND u.email_verified = false
	AND u.tour_completed = false
	AND u.is_subscribed = false
	AND u.subscription_ended_at IS NULL
	AND u.subscription_plan IS NULL
	AND u.stripe_customer_id IS NULL
	AND u.stripe_subscription_id IS NULL
	AND u.premium_trial_claimed_at IS NULL
	AND u.rso_subject_id IS NOT NULL
	AND NOT EXISTS (
		SELECT 1 FROM folders f
		WHERE f.user_id = u.id
	)
	AND NOT EXISTS (
		SELECT 1 FROM strategies s
		WHERE s.user_id = u.id
	)
	AND NOT EXISTS (
		SELECT 1 FROM stack_members sm
		WHERE sm.owner_user_id = u.id OR sm.member_user_id = u.id
	)`

func NewCleanupScheduler(db *pgxpool.Pool, interval time.Duration) *CleanupScheduler {
	cleanupQuery := `
		DELETE FROM lobbies
		WHERE updated_at < NOW() - INTERVAL '12 hours'
		AND code NOT IN (
			SELECT DISTINCT lobby_code
			FROM strategies
		)`

	subscriptionCleanupQuery := `
		DELETE FROM strategies
		WHERE id IN (
			SELECT s.id
			FROM strategies s
			JOIN users u ON u.id = s.user_id
			WHERE u.is_subscribed = false
			AND u.subscription_ended_at IS NOT NULL
			AND u.subscription_ended_at < NOW() - INTERVAL '14 days'
			AND (
				SELECT COUNT(*) FROM strategies s2
				WHERE s2.user_id = s.user_id AND s2.id > s.id
			) >= 3
		)`

	deadRegistrationQuery := deadRegistrationCleanupQuery

	webhookEventsCleanupQuery := `
		DELETE FROM stripe_webhook_events
		WHERE processed_at < NOW() - INTERVAL '7 days'`

	return &CleanupScheduler{
		db:                        db,
		interval:                  interval,
		stopChan:                  make(chan struct{}),
		cleanupQuery:              cleanupQuery,
		subscriptionCleanupQuery:  subscriptionCleanupQuery,
		deadRegistrationQuery:     deadRegistrationQuery,
		webhookEventsCleanupQuery: webhookEventsCleanupQuery,
	}
}

func (cs *CleanupScheduler) Start() {
	slog.Info("cleanup scheduler started", "interval", cs.interval)

	cs.runCleanup()

	ticker := time.NewTicker(cs.interval)

	go func() {
		for {
			select {
			case <-ticker.C:
				cs.runCleanup()
			case <-cs.stopChan:
				ticker.Stop()
				slog.Info("cleanup scheduler stopped")
				return
			}
		}
	}()
}

func (cs *CleanupScheduler) Stop() {
	cs.stopOnce.Do(func() {
		close(cs.stopChan)
	})
}

func (cs *CleanupScheduler) runCleanup() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	slog.Info("running cleanup for lobbies")

	cmdTag, err := cs.db.Exec(ctx, cs.cleanupQuery)
	if err != nil {
		slog.Error("lobby cleanup failed", "error", err)
		return
	}
	slog.Info("lobby cleanup completed", "deleted", cmdTag.RowsAffected())

	slog.Info("running cleanup for downgraded user strategies")

	cmdTag, err = cs.db.Exec(ctx, cs.subscriptionCleanupQuery)
	if err != nil {
		slog.Error("subscription cleanup failed", "error", err)
		return
	}
	slog.Info("subscription cleanup completed", "deleted", cmdTag.RowsAffected())

	slog.Info("running cleanup for dead registrations")

	deletedRows, err := cs.runDeadRegistrationCleanup(ctx)
	if err != nil {
		slog.Error("dead registration cleanup failed", "error", err)
		return
	}
	slog.Info("dead registration cleanup completed", "deleted", deletedRows)

	slog.Info("running cleanup for stale stripe webhook events")

	cmdTag, err = cs.db.Exec(ctx, cs.webhookEventsCleanupQuery)
	if err != nil {
		slog.Error("webhook events cleanup failed", "error", err)
		return
	}
	slog.Info("webhook events cleanup completed", "deleted", cmdTag.RowsAffected())

	cs.runImageObjectCleanup(ctx)
}

func (cs *CleanupScheduler) runDeadRegistrationCleanup(ctx context.Context) (int64, error) {
	cmdTag, err := cs.db.Exec(ctx, cs.deadRegistrationQuery)
	if err != nil {
		return 0, err
	}

	return cmdTag.RowsAffected(), nil
}

func (cs *CleanupScheduler) runImageObjectCleanup(ctx context.Context) {
	if storage.DefaultClient == nil {
		slog.Info("skipping image object cleanup: tigris not configured")
		return
	}

	slog.Info("running cleanup for orphaned image objects")

	referencedKeys, err := cs.getReferencedImageKeys(ctx)
	if err != nil {
		slog.Error("failed to gather referenced image keys", "error", err)
		return
	}

	bucketKeys, err := storage.DefaultClient.ListObjectKeys(ctx, "images/")
	if err != nil {
		slog.Error("failed to list image objects from tigris", "error", err)
		return
	}

	orphanedKeys := make([]string, 0)
	for _, key := range bucketKeys {
		if _, exists := referencedKeys[key]; !exists {
			orphanedKeys = append(orphanedKeys, key)
		}
	}

	if len(orphanedKeys) == 0 {
		slog.Info("image object cleanup completed", "deleted", 0, "tracked", len(referencedKeys), "bucket", len(bucketKeys))
		return
	}

	const deleteBatchSize = 1000
	deletedCount := 0
	for i := 0; i < len(orphanedKeys); i += deleteBatchSize {
		end := min(i+deleteBatchSize, len(orphanedKeys))

		batch := orphanedKeys[i:end]
		if err := storage.DefaultClient.DeleteObjects(ctx, batch); err != nil {
			slog.Error("failed deleting orphaned image objects batch", "batch_size", len(batch), "error", err)
			continue
		}

		deletedCount += len(batch)
	}

	slog.Info("image object cleanup completed", "deleted", deletedCount, "tracked", len(referencedKeys), "bucket", len(bucketKeys))
}

func (cs *CleanupScheduler) getReferencedImageKeys(ctx context.Context) (map[string]struct{}, error) {
	referenced := make(map[string]struct{})

	imageRows, err := cs.db.Query(ctx, `SELECT src FROM canvas_images WHERE src IS NOT NULL AND src <> ''`)
	if err != nil {
		return nil, err
	}
	defer imageRows.Close()

	for imageRows.Next() {
		var src string
		if err := imageRows.Scan(&src); err != nil {
			return nil, err
		}

		if key, ok := extractImageObjectKey(src); ok {
			referenced[key] = struct{}{}
		}
	}
	if err := imageRows.Err(); err != nil {
		return nil, err
	}

	lineRows, err := cs.db.Query(ctx, `SELECT uploaded_images FROM canvas_connecting_lines WHERE uploaded_images IS NOT NULL`)
	if err != nil {
		return nil, err
	}
	defer lineRows.Close()

	for lineRows.Next() {
		var refs []string
		if err := lineRows.Scan(&refs); err != nil {
			return nil, err
		}

		for _, ref := range refs {
			if key, ok := extractImageObjectKey(ref); ok {
				referenced[key] = struct{}{}
			}
		}
	}
	if err := lineRows.Err(); err != nil {
		return nil, err
	}

	return referenced, nil
}

func extractImageObjectKey(rawRef string) (string, bool) {
	ref := strings.TrimSpace(rawRef)
	if ref == "" {
		return "", false
	}

	if strings.HasPrefix(ref, "images/") {
		return ref, true
	}

	parsed, err := url.Parse(ref)
	if err != nil {
		return "", false
	}

	if queryKey := strings.TrimSpace(parsed.Query().Get("key")); strings.HasPrefix(queryKey, "images/") {
		return queryKey, true
	}

	trimmedPath := strings.Trim(parsed.Path, "/")
	if idx := strings.Index(trimmedPath, "images/"); idx >= 0 {
		return trimmedPath[idx:], true
	}

	return "", false
}
