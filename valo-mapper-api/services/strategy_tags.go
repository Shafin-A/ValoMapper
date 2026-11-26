package services

import (
	"errors"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	MaxStrategyTags      = 8
	MaxStrategyTagLength = 24
)

var (
	ErrStrategyTooManyTags      = errors.New("too many strategy tags")
	ErrStrategyInvalidTag       = errors.New("invalid strategy tag")
	ErrStrategyInvalidSide      = errors.New("invalid strategy side")
	ErrStrategyInvalidSort      = errors.New("invalid strategy sort")
	ErrStrategyInvalidTagMode   = errors.New("invalid strategy tag mode")
	ErrStrategyInvalidSelection = errors.New("invalid strategy selection")
)

// NormalizeStrategyTags trims, lowercases, collapses whitespace, deduplicates,
// and validates user-supplied strategy tags.
func NormalizeStrategyTags(tags []string) ([]string, error) {
	normalized := make([]string, 0, len(tags))
	seen := make(map[string]struct{}, len(tags))

	for _, raw := range tags {
		tag := strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(raw))), " ")
		if tag == "" {
			continue
		}

		if utf8.RuneCountInString(tag) > MaxStrategyTagLength {
			return nil, ErrStrategyInvalidTag
		}

		for _, r := range tag {
			if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != ' ' && r != '-' && r != '_' {
				return nil, ErrStrategyInvalidTag
			}
		}

		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		normalized = append(normalized, tag)

		if len(normalized) > MaxStrategyTags {
			return nil, ErrStrategyTooManyTags
		}
	}

	sort.Strings(normalized)
	return normalized, nil
}
