package models

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

func marshalIconSettings(settings *IconSettings) ([]byte, error) {
	if settings == nil {
		return nil, nil
	}
	return json.Marshal(settings)
}

func dedupeRows(rows [][]any, keyIndices []int) [][]any {
	seen := make(map[string]struct{}, len(rows))
	filtered := make([][]any, 0, len(rows))

	for _, row := range rows {
		keyParts := make([]string, 0, len(keyIndices))
		for _, idx := range keyIndices {
			if idx < 0 || idx >= len(row) {
				keyParts = append(keyParts, "")
				continue
			}
			keyParts = append(keyParts, rowKeyPart(row[idx]))
		}

		key := strings.Join(keyParts, "\x00")
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		filtered = append(filtered, row)
	}

	return filtered
}

func rowKeyPart(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	default:
		return fmt.Sprintf("%v", v)
	}
}
