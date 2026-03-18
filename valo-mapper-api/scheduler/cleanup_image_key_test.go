package scheduler

import "testing"

func TestExtractImageObjectKey(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		want   string
		wantOK bool
	}{
		{
			name:   "proxy URL with encoded key",
			input:  "/api/images/object?key=images%2Fabc123.png",
			want:   "images/abc123.png",
			wantOK: true,
		},
		{
			name:   "direct tigris URL",
			input:  "https://fly.storage.tigris.dev/my-bucket/images/def456.webp",
			want:   "images/def456.webp",
			wantOK: true,
		},
		{
			name:   "raw key",
			input:  "images/ghi789.jpg",
			want:   "images/ghi789.jpg",
			wantOK: true,
		},
		{
			name:   "data url should be ignored",
			input:  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
			want:   "",
			wantOK: false,
		},
		{
			name:   "empty",
			input:  "   ",
			want:   "",
			wantOK: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := extractImageObjectKey(tt.input)
			if ok != tt.wantOK {
				t.Fatalf("ok mismatch: got %v, want %v", ok, tt.wantOK)
			}
			if got != tt.want {
				t.Fatalf("key mismatch: got %q, want %q", got, tt.want)
			}
		})
	}
}
