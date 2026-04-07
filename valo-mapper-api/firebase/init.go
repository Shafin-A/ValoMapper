package firebase

import (
	"context"
	"errors"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"golang.org/x/oauth2/google"
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

	creds, err := google.CredentialsFromJSONWithTypeAndParams(ctx, []byte(credsJSON), google.ServiceAccount, google.CredentialsParams{
		Scopes: []string{
			"https://www.googleapis.com/auth/cloud-platform",
			"https://www.googleapis.com/auth/firebase",
		},
	})
	if err != nil {
		return nil, err
	}

	app, err := firebase.NewApp(ctx, nil, option.WithCredentials(creds))
	if err != nil {
		return nil, err
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}

	return authClient, nil
}
