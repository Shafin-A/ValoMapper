package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeStrategyTags(t *testing.T) {
	t.Run("trims, lowercases, deduplicates, and sorts", func(t *testing.T) {
		tags, err := NormalizeStrategyTags([]string{
			"  Post-Plant ",
			"a-site",
			"post-plant",
			"  ",
			"A Site",
		})

		require.NoError(t, err)
		assert.Equal(t, []string{"a site", "a-site", "post-plant"}, tags)
	})

	t.Run("allows unicode letters and digits", func(t *testing.T) {
		tags, err := NormalizeStrategyTags([]string{"Édition 2", "план_б"})

		require.NoError(t, err)
		assert.Equal(t, []string{"édition 2", "план_б"}, tags)
	})

	t.Run("rejects invalid characters", func(t *testing.T) {
		_, err := NormalizeStrategyTags([]string{"post/plant"})

		assert.ErrorIs(t, err, ErrStrategyInvalidTag)
	})

	t.Run("rejects tags over the length limit", func(t *testing.T) {
		_, err := NormalizeStrategyTags([]string{"this-tag-is-longer-than-twenty-four"})

		assert.ErrorIs(t, err, ErrStrategyInvalidTag)
	})

	t.Run("rejects too many tags", func(t *testing.T) {
		_, err := NormalizeStrategyTags([]string{
			"a", "b", "c", "d", "e", "f", "g", "h", "i",
		})

		assert.ErrorIs(t, err, ErrStrategyTooManyTags)
	})
}
