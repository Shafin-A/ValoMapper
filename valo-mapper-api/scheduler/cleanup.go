package scheduler

import (
	"context"
	"log"
	"time"

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
}
