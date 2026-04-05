package handlers

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"valo-mapper-api/storage"
)

type mockStorageClient struct {
	uploadFn func(ctx context.Context, key string, data io.Reader, contentType string, contentLength int64) (string, error)
	getFn    func(ctx context.Context, key string) (io.ReadCloser, string, error)
}

func (m *mockStorageClient) UploadImage(ctx context.Context, key string, data io.Reader, contentType string, contentLength int64) (string, error) {
	if m.uploadFn != nil {
		return m.uploadFn(ctx, key, data, contentType, contentLength)
	}
	return "https://example.com/" + key, nil
}

func (m *mockStorageClient) GetImage(ctx context.Context, key string) (io.ReadCloser, string, error) {
	if m.getFn != nil {
		return m.getFn(ctx, key)
	}
	return io.NopCloser(strings.NewReader("image bytes")), "image/png", nil
}

func (m *mockStorageClient) ListObjectKeys(_ context.Context, _ string) ([]string, error) {
	return nil, nil
}

func (m *mockStorageClient) DeleteObjects(_ context.Context, _ []string) error {
	return nil
}

// setMockStorage replaces DefaultClient for the duration of the test.
func setMockStorage(t *testing.T, client storage.Client) {
	t.Helper()
	orig := storage.DefaultClient
	storage.DefaultClient = client
	t.Cleanup(func() { storage.DefaultClient = orig })
}

// buildImageBody creates a multipart/form-data body with file data under fieldName.
func buildImageBody(t *testing.T, fieldName, filename string, data []byte) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile(fieldName, filename)
	if err != nil {
		t.Fatalf("CreateFormFile: %v", err)
	}
	if _, err := fw.Write(data); err != nil {
		t.Fatalf("Write image body: %v", err)
	}
	if err := mw.Close(); err != nil {
		t.Fatalf("Close multipart writer: %v", err)
	}
	return &buf, mw.FormDataContentType()
}

// pngBytes returns a minimal byte slice that http.DetectContentType identifies as image/png.
func pngBytes() []byte {
	return []byte("\x89PNG\r\n\x1a\n")
}

// ---- UploadImage tests ----

func TestUploadImage_StorageNotConfigured(t *testing.T) {
	setMockStorage(t, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/images/upload", nil)
	rr := httptest.NewRecorder()
	UploadImage(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", rr.Code)
	}
}

func TestUploadImage_FileTooLarge(t *testing.T) {
	setMockStorage(t, &mockStorageClient{})

	// File data just large enough to push the total body past maxImageUploadBytes+512.
	large := make([]byte, 5<<20+600)
	body, ct := buildImageBody(t, "image", "large.png", large)

	req := httptest.NewRequest(http.MethodPost, "/api/images/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	UploadImage(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestUploadImage_MissingImageField(t *testing.T) {
	setMockStorage(t, &mockStorageClient{})

	// Valid multipart form but without any "image" field.
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/images/upload", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rr := httptest.NewRecorder()
	UploadImage(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestUploadImage_UnsupportedMimeType(t *testing.T) {
	setMockStorage(t, &mockStorageClient{})

	textData := fmt.Appendf(nil, "%s", strings.Repeat("Hello World ", 10))
	body, ct := buildImageBody(t, "image", "test.txt", textData)

	req := httptest.NewRequest(http.MethodPost, "/api/images/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	UploadImage(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestUploadImage_StorageError(t *testing.T) {
	mock := &mockStorageClient{
		uploadFn: func(_ context.Context, _ string, _ io.Reader, _ string, _ int64) (string, error) {
			return "", errors.New("storage unavailable")
		},
	}
	setMockStorage(t, mock)

	body, ct := buildImageBody(t, "image", "test.png", pngBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/images/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	UploadImage(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", rr.Code)
	}
}

func TestUploadImage_Success(t *testing.T) {
	var capturedKey string
	mock := &mockStorageClient{
		uploadFn: func(_ context.Context, key string, _ io.Reader, _ string, _ int64) (string, error) {
			capturedKey = key
			return "https://example.com/" + key, nil
		},
	}
	setMockStorage(t, mock)

	body, ct := buildImageBody(t, "image", "photo.png", pngBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/images/upload", body)
	req.Header.Set("Content-Type", ct)
	rr := httptest.NewRecorder()
	UploadImage(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	if !strings.HasPrefix(capturedKey, "images/") {
		t.Errorf("storage key should start with 'images/', got: %s", capturedKey)
	}
	if !strings.HasSuffix(capturedKey, ".png") {
		t.Errorf("storage key should end with '.png', got: %s", capturedKey)
	}
}

// ---- GetImage tests ----

func TestGetImage_StorageNotConfigured(t *testing.T) {
	setMockStorage(t, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/images/object?key=images/abc.png", nil)
	rr := httptest.NewRecorder()
	GetImage(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", rr.Code)
	}
}

func TestGetImage_MissingKey(t *testing.T) {
	setMockStorage(t, &mockStorageClient{})

	req := httptest.NewRequest(http.MethodGet, "/api/images/object", nil)
	rr := httptest.NewRecorder()
	GetImage(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestGetImage_InvalidKey(t *testing.T) {
	setMockStorage(t, &mockStorageClient{})

	cases := []string{
		"../etc/passwd",
		"/images/foo.png",
		"foo.png",
		"images/../secret",
		"images/../../etc/passwd",
	}
	for _, key := range cases {
		t.Run(key, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/images/object?key="+url.QueryEscape(key), nil)
			rr := httptest.NewRecorder()
			GetImage(rr, req)
			if rr.Code != http.StatusBadRequest {
				t.Errorf("key %q: expected 400, got %d", key, rr.Code)
			}
		})
	}
}

func TestGetImage_StorageError(t *testing.T) {
	mock := &mockStorageClient{
		getFn: func(_ context.Context, _ string) (io.ReadCloser, string, error) {
			return nil, "", errors.New("object not found in storage")
		},
	}
	setMockStorage(t, mock)

	req := httptest.NewRequest(http.MethodGet, "/api/images/object?key=images/abc.png", nil)
	rr := httptest.NewRecorder()
	GetImage(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestGetImage_Success(t *testing.T) {
	mock := &mockStorageClient{
		getFn: func(_ context.Context, _ string) (io.ReadCloser, string, error) {
			return io.NopCloser(strings.NewReader("fake png content")), "image/png", nil
		},
	}
	setMockStorage(t, mock)

	req := httptest.NewRequest(http.MethodGet, "/api/images/object?key=images/test.png", nil)
	rr := httptest.NewRecorder()
	GetImage(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	if ct := rr.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("expected Content-Type image/png, got %q", ct)
	}
	if body := rr.Body.String(); body != "fake png content" {
		t.Errorf("unexpected response body: %q", body)
	}
}

func TestGetImage_EmptyContentTypeFallback(t *testing.T) {
	mock := &mockStorageClient{
		getFn: func(_ context.Context, _ string) (io.ReadCloser, string, error) {
			return io.NopCloser(strings.NewReader("data")), "", nil
		},
	}
	setMockStorage(t, mock)

	req := httptest.NewRequest(http.MethodGet, "/api/images/object?key=images/test.bin", nil)
	rr := httptest.NewRecorder()
	GetImage(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/octet-stream" {
		t.Errorf("expected fallback Content-Type application/octet-stream, got %q", ct)
	}
}
