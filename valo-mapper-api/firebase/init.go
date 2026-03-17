package firebase

import (
	"context"
	"errors"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

func InitFirebaseAuth() (*auth.Client, error) {
	ctx := context.Background()

	credsJSON := strings.TrimSpace(os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"))
	if credsJSON == "" {
		return nil, errors.New("GOOGLE_APPLICATION_CREDENTIALS is required")
	}

	if !strings.HasPrefix(credsJSON, "{") {
		return nil, errors.New("GOOGLE_APPLICATION_CREDENTIALS must contain Firebase service account JSON (file paths are not supported)")
	}

	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsJSON([]byte(credsJSON)))
	if err != nil {
		return nil, err
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}

	return authClient, nil
}
