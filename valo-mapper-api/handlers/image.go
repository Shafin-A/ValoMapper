package handlers

import (
	"bytes"
	"io"
	"net/http"
	"path"
	"strings"

	"valo-mapper-api/middleware"
	"valo-mapper-api/storage"
	"valo-mapper-api/utils"

	"github.com/google/uuid"
)

// maxImageUploadBytes caps each upload at 5 MiB.
const maxImageUploadBytes = 5 << 20

// allowedImageTypes maps accepted MIME types to their file extension.
var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

// UploadImageResponse is the JSON body returned on a successful upload.
type UploadImageResponse struct {
	URL string `json:"url"`
	Key string `json:"key"`
}

// UploadImage godoc
// @Summary      Upload image to object storage
// @Description  Accepts a multipart/form-data payload with a single "image" field.
//
//	Stores the file in Tigris and returns the public URL and storage key.
//
// @Tags         images
// @Accept       multipart/form-data
// @Produce      json
// @Param        image  formData  file  true  "Image file (JPEG/PNG/GIF/WEBP, max 5 MiB)"
// @Success      200  {object}  UploadImageResponse
// @Failure      400  {object}  ErrorResponse
// @Failure      503  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /api/images/upload [post]
func UploadImage(w http.ResponseWriter, r *http.Request) {
	if storage.DefaultClient == nil {
		utils.SendJSONError(w, utils.NewInternal("Image storage is not configured", nil), middleware.GetRequestID(r))
		return
	}

	// Cap incoming body before ParseMultipartForm reads it.
	r.Body = http.MaxBytesReader(w, r.Body, maxImageUploadBytes+512)
	if err := r.ParseMultipartForm(maxImageUploadBytes); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("File too large or malformed payload (max 5 MiB)"), middleware.GetRequestID(r))
		return
	}

	file, fileHeader, err := r.FormFile("image")
	if err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Missing 'image' field in form"), middleware.GetRequestID(r))
		return
	}
	defer file.Close()

	// Validate by actual bytes to avoid relying only on client-supplied headers.
	sniffBuf := make([]byte, 512)
	sniffLen, sniffErr := io.ReadFull(file, sniffBuf)
	if sniffErr != nil && sniffErr != io.EOF && sniffErr != io.ErrUnexpectedEOF {
		utils.SendJSONError(w, utils.NewBadRequest("Unable to read uploaded file"), middleware.GetRequestID(r))
		return
	}
	sniffBuf = sniffBuf[:sniffLen]

	detectedType := strings.ToLower(strings.TrimSpace(http.DetectContentType(sniffBuf)))
	if semi := strings.Index(detectedType, ";"); semi >= 0 {
		detectedType = strings.TrimSpace(detectedType[:semi])
	}

	ext, ok := allowedImageTypes[detectedType]
	if !ok {
		utils.SendJSONError(w, utils.NewBadRequest("Unsupported image type; accepted: JPEG, PNG, GIF, WEBP"), middleware.GetRequestID(r))
		return
	}

	key := path.Join("images", uuid.New().String()+ext)

	fileReader := io.MultiReader(bytes.NewReader(sniffBuf), file)

	url, err := storage.DefaultClient.UploadImage(r.Context(), key, fileReader, detectedType, fileHeader.Size)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to upload image", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, UploadImageResponse{URL: url, Key: key}, middleware.GetRequestID(r))
}

// GetImage godoc
// @Summary      Fetch image from object storage
// @Description  Streams an image by key using backend credentials.
// @Tags         images
// @Produce      octet-stream
// @Param        key  query  string  true  "Object key"
// @Success      200  {file}  binary
// @Failure      400  {object}  ErrorResponse
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /api/images/object [get]
func GetImage(w http.ResponseWriter, r *http.Request) {
	if storage.DefaultClient == nil {
		utils.SendJSONError(w, utils.NewInternal("Image storage is not configured", nil), middleware.GetRequestID(r))
		return
	}

	key := strings.TrimSpace(r.URL.Query().Get("key"))
	if key == "" {
		utils.SendJSONError(w, utils.NewBadRequest("Missing image key"), middleware.GetRequestID(r))
		return
	}

	if strings.HasPrefix(key, "/") || strings.Contains(key, "..") || !strings.HasPrefix(key, "images/") {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid image key"), middleware.GetRequestID(r))
		return
	}

	body, contentType, err := storage.DefaultClient.GetImage(r.Context(), key)
	if err != nil {
		utils.SendJSONError(w, utils.NewNotFound("Image not found"), middleware.GetRequestID(r))
		return
	}
	defer body.Close()

	if contentType == "" {
		contentType = "application/octet-stream"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.WriteHeader(http.StatusOK)

	if _, err := io.Copy(w, body); err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to stream image", err), middleware.GetRequestID(r))
		return
	}
}
