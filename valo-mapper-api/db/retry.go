package db

import (
	"context"
	"errors"
	"io"
	"log"
	"net"
	"strings"
	"time"
)

func IsRetryableError(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()
	retryableErrors := []string{
		"unexpected EOF",
		"connection reset by peer",
		"broken pipe",
		"connection refused",
		"no connection",
		"connection timed out",
		"i/o timeout",
	}

	for _, retryable := range retryableErrors {
		if strings.Contains(strings.ToLower(errStr), retryable) {
			return true
		}
	}

	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}

	if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		return true
	}

	return false
}

func WithRetry[T any](ctx context.Context, maxRetries int, operation func() (T, error)) (T, error) {
	var result T
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		result, lastErr = operation()
		if lastErr == nil {
			return result, nil
		}

		if !IsRetryableError(lastErr) {
			return result, lastErr
		}

		if attempt < maxRetries {
			backoff := time.Duration(50*(1<<attempt)) * time.Millisecond // 50ms, 100ms, 200ms...
			if backoff > 500*time.Millisecond {
				backoff = 500 * time.Millisecond
			}
			log.Printf("Retryable DB error (attempt %d/%d): %v, retrying in %v", attempt+1, maxRetries+1, lastErr, backoff)

			select {
			case <-ctx.Done():
				return result, ctx.Err()
			case <-time.After(backoff):
			}
		}
	}

	return result, lastErr
}

func WithRetryNoResult(ctx context.Context, maxRetries int, operation func() error) error {
	_, err := WithRetry(ctx, maxRetries, func() (struct{}, error) {
		return struct{}{}, operation()
	})
	return err
}
