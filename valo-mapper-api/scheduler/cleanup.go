package scheduler

import (
	"context"
	"log"
	"net/url"
	"strings"
	"time"
	"valo-mapper-api/storage"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CleanupScheduler struct {
	db                       *pgxpool.Pool
	interval                 time.Duration
	stopChan                 chan struct{}
	cleanupQuery             string
	subscriptionCleanupQuery string
}

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

	return &CleanupScheduler{
		db:                       db,
		interval:                 interval,
		stopChan:                 make(chan struct{}),
		cleanupQuery:             cleanupQuery,
		subscriptionCleanupQuery: subscriptionCleanupQuery,
	}
}

func (cs *CleanupScheduler) Start() {
	log.Printf("Starting cleanup scheduler for lobbies (interval: %v)", cs.interval)

	cs.runCleanup()

	ticker := time.NewTicker(cs.interval)

	go func() {
		for {
			select {
			case <-ticker.C:
				cs.runCleanup()
			case <-cs.stopChan:
				ticker.Stop()
				log.Println("Cleanup scheduler stopped")
				return
			}
		}
	}()
}

func (cs *CleanupScheduler) Stop() {
	close(cs.stopChan)
}

func (cs *CleanupScheduler) runCleanup() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Println("Running cleanup for lobbies...")

	cmdTag, err := cs.db.Exec(ctx, cs.cleanupQuery)
	if err != nil {
		log.Printf("ERROR: Cleanup failed: %v", err)
		return
	}
	log.Printf("Cleanup completed: %d lobbies deleted", cmdTag.RowsAffected())

	log.Println("Running cleanup for downgraded user strategies...")

	cmdTag, err = cs.db.Exec(ctx, cs.subscriptionCleanupQuery)
	if err != nil {
		log.Printf("ERROR: Subscription cleanup failed: %v", err)
		return
	}
	log.Printf("Subscription cleanup completed: %d excess strategies deleted", cmdTag.RowsAffected())

	cs.runImageObjectCleanup(ctx)
}

func (cs *CleanupScheduler) runImageObjectCleanup(ctx context.Context) {
	if storage.DefaultClient == nil {
		log.Println("Skipping image object cleanup: Tigris storage not configured")
		return
	}

	log.Println("Running cleanup for orphaned image objects...")

	referencedKeys, err := cs.getReferencedImageKeys(ctx)
	if err != nil {
		log.Printf("ERROR: Failed to gather referenced image keys: %v", err)
		return
	}

	bucketKeys, err := storage.DefaultClient.ListObjectKeys(ctx, "images/")
	if err != nil {
		log.Printf("ERROR: Failed to list image objects from Tigris: %v", err)
		return
	}

	orphanedKeys := make([]string, 0)
	for _, key := range bucketKeys {
		if _, exists := referencedKeys[key]; !exists {
			orphanedKeys = append(orphanedKeys, key)
		}
	}

	if len(orphanedKeys) == 0 {
		log.Printf("Image object cleanup completed: 0 orphaned objects deleted (tracked=%d, bucket=%d)", len(referencedKeys), len(bucketKeys))
		return
	}

	const deleteBatchSize = 1000
	deletedCount := 0
	for i := 0; i < len(orphanedKeys); i += deleteBatchSize {
		end := i + deleteBatchSize
		if end > len(orphanedKeys) {
			end = len(orphanedKeys)
		}

		batch := orphanedKeys[i:end]
		if err := storage.DefaultClient.DeleteObjects(ctx, batch); err != nil {
			log.Printf("ERROR: Failed deleting orphaned image objects batch (size=%d): %v", len(batch), err)
			continue
		}

		deletedCount += len(batch)
	}

	log.Printf("Image object cleanup completed: %d orphaned objects deleted (tracked=%d, bucket=%d)", deletedCount, len(referencedKeys), len(bucketKeys))
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
