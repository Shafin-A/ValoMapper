package storage

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

const defaultTigrisEndpoint = "https://fly.storage.tigris.dev"

// TigrisClient wraps an S3-compatible client configured for Tigris.
type TigrisClient struct {
	s3       *s3.Client
	bucket   string
	endpoint string
}

// Client is the interface satisfied by TigrisClient and any test double.
type Client interface {
	UploadImage(ctx context.Context, key string, data io.Reader, contentType string, contentLength int64) (string, error)
	GetImage(ctx context.Context, key string) (io.ReadCloser, string, error)
	ListObjectKeys(ctx context.Context, prefix string) ([]string, error)
	DeleteObjects(ctx context.Context, keys []string) error
}

// DefaultClient is the package-level Tigris client, set by InitTigris.
var DefaultClient Client

// InitTigris reads credentials from environment variables and initialises
// DefaultClient.  The variables match exactly what `fly storage create` injects:
//
//	AWS_ACCESS_KEY_ID
//	AWS_SECRET_ACCESS_KEY
//	BUCKET_NAME
//	AWS_ENDPOINT_URL_S3  (optional, defaults to https://fly.storage.tigris.dev)
//	AWS_REGION           (optional, defaults to "auto")
//
// The application treats image storage as optional so that the server can still
// start without Tigris configured (uploads will return 503).
func InitTigris() error {
	accessKeyID := os.Getenv("AWS_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("BUCKET_NAME")

	if accessKeyID == "" || secretAccessKey == "" || bucketName == "" {
		return fmt.Errorf("Tigris env vars not set (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME)")
	}

	endpoint := os.Getenv("AWS_ENDPOINT_URL_S3")
	if endpoint == "" {
		endpoint = defaultTigrisEndpoint
	}

	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "auto"
	}

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID, secretAccessKey, "",
		)),
	)
	if err != nil {
		return fmt.Errorf("failed to build Tigris config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
	})

	DefaultClient = &TigrisClient{
		s3:       client,
		bucket:   bucketName,
		endpoint: endpoint,
	}

	slog.Info("tigris storage initialized", "bucket", bucketName)
	return nil
}

// UploadImage streams data to Tigris under key and returns the public object URL.
func (t *TigrisClient) UploadImage(ctx context.Context, key string, data io.Reader, contentType string, contentLength int64) (string, error) {
	putInput := &s3.PutObjectInput{
		Bucket:      aws.String(t.bucket),
		Key:         aws.String(key),
		Body:        data,
		ContentType: aws.String(contentType),
	}

	if contentLength >= 0 {
		putInput.ContentLength = aws.Int64(contentLength)
	}

	_, err := t.s3.PutObject(ctx, putInput)
	if err != nil {
		return "", fmt.Errorf("PutObject %s: %w", key, err)
	}
	return fmt.Sprintf("%s/%s/%s", t.endpoint, t.bucket, key), nil
}

// GetImage fetches an image object from Tigris by key.
func (t *TigrisClient) GetImage(ctx context.Context, key string) (io.ReadCloser, string, error) {
	out, err := t.s3.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(t.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, "", fmt.Errorf("GetObject %s: %w", key, err)
	}

	return out.Body, aws.ToString(out.ContentType), nil
}

// ListObjectKeys returns object keys from the configured bucket for a prefix.
func (t *TigrisClient) ListObjectKeys(ctx context.Context, prefix string) ([]string, error) {
	paginator := s3.NewListObjectsV2Paginator(t.s3, &s3.ListObjectsV2Input{
		Bucket: aws.String(t.bucket),
		Prefix: aws.String(prefix),
	})

	keys := make([]string, 0)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("ListObjectsV2: %w", err)
		}

		for _, obj := range page.Contents {
			if obj.Key != nil && *obj.Key != "" {
				keys = append(keys, *obj.Key)
			}
		}
	}

	return keys, nil
}

// DeleteObjects removes up to 1000 keys in a single batch request.
// Errors from individual key deletions are surfaced via the S3 Errors slice and
// logged, but do not halt deletion of other keys.
func (t *TigrisClient) DeleteObjects(ctx context.Context, keys []string) error {
	if len(keys) == 0 {
		return nil
	}

	objects := make([]types.ObjectIdentifier, len(keys))
	for i, k := range keys {
		key := k
		objects[i] = types.ObjectIdentifier{Key: &key}
	}

	out, err := t.s3.DeleteObjects(ctx, &s3.DeleteObjectsInput{
		Bucket: aws.String(t.bucket),
		Delete: &types.Delete{Objects: objects},
	})
	if err != nil {
		return fmt.Errorf("DeleteObjects: %w", err)
	}

	for _, e := range out.Errors {
		slog.Error("tigris deleteobjects partial error", "key", aws.ToString(e.Key), "code", aws.ToString(e.Code), "message", aws.ToString(e.Message))
	}
	return nil
}
