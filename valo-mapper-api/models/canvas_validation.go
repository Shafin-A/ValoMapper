package models

import (
	"net/url"
	"path"
	"strings"
)

var allowedImageExtensions = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".gif":  {},
	".webp": {},
}

func hasBlockedProtocol(raw string) bool {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	return strings.HasPrefix(trimmed, "javascript:") || strings.HasPrefix(trimmed, "data:") || strings.HasPrefix(trimmed, "vbscript:") || strings.HasPrefix(trimmed, "file:")
}

func isAllowedLink(raw string) bool {
	link := strings.TrimSpace(raw)
	if link == "" {
		return true
	}

	if hasBlockedProtocol(link) {
		return false
	}

	parsed, err := url.Parse(link)
	if err != nil {
		return false
	}

	if parsed.Scheme == "" {
		return true
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	if parsed.Host == "" {
		return false
	}

	return true
}

func isAllowedImageSource(raw string) bool {
	ref := strings.TrimSpace(raw)
	if ref == "" {
		return false
	}

	if hasBlockedProtocol(ref) {
		return false
	}

	if strings.HasPrefix(ref, "images/") {
		return true
	}

	if strings.HasPrefix(ref, "/api/images/object") {
		u, err := url.Parse(ref)
		if err != nil {
			return false
		}
		if key := strings.TrimSpace(u.Query().Get("key")); key != "" {
			return true
		}
		return false
	}

	parsed, err := url.Parse(ref)
	if err != nil {
		return false
	}

	if parsed.Scheme == "" {
		ext := strings.ToLower(path.Ext(parsed.Path))
		_, ok := allowedImageExtensions[ext]
		return ok
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	if parsed.Host == "" {
		return false
	}

	ext := strings.ToLower(path.Ext(parsed.Path))
	if ext != "" {
		_, ok := allowedImageExtensions[ext]
		if ok {
			return true
		}
	}

	if strings.Contains(strings.ToLower(parsed.Path), "/images/") {
		return true
	}

	return false
}

func validateCanvasState(state FullCanvasState) error {
	if len(state.Phases) > phaseCount {
		return invalidPatchError("canvas state has %d phases (max %d)", len(state.Phases), phaseCount)
	}

	for _, phase := range state.Phases {
		for _, i := range phase.ImagesOnCanvas {
			if i.Src != "" && !isAllowedImageSource(i.Src) {
				return invalidPatchError("invalid image source in canvas state: %s", i.Src)
			}
		}

		for _, cl := range phase.ConnectingLines {
			for _, img := range cl.UploadedImages {
				if img != "" && !isAllowedImageSource(img) {
					return invalidPatchError("invalid uploaded image source in connecting line canvas state: %s", img)
				}
			}

			if cl.YoutubeLink != "" && !isAllowedLink(cl.YoutubeLink) {
				return invalidPatchError("invalid link in connecting line canvas state: %s", cl.YoutubeLink)
			}
		}
	}
	return nil
}
