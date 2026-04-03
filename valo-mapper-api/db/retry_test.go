package db

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsRetryableError(t *testing.T) {
	t.Run("detects unexpected EOF as retryable", func(t *testing.T) {
		err := errors.New("failed to receive message: unexpected EOF")
		assert.True(t, IsRetryableError(err))
	})

	t.Run("returns false for non-retryable error", func(t *testing.T) {
		err := errors.New("syntax error at or near \"SELECT\"")
		assert.False(t, IsRetryableError(err))
	})
}
