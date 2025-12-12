package firebase

import (
	"context"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

func InitFirebaseAuth() (*auth.Client, error) {
	ctx := context.Background()

	credsEnv := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	var opt option.ClientOption

	trimmed := ""
	if len(credsEnv) > 0 {
		for i := 0; i < len(credsEnv); i++ {
			if credsEnv[i] != ' ' && credsEnv[i] != '\t' && credsEnv[i] != '\n' && credsEnv[i] != '\r' {
				trimmed = credsEnv[i:]
				break
			}
		}
	}

	if len(trimmed) > 0 && trimmed[0] == '{' {
		opt = option.WithCredentialsJSON([]byte(credsEnv))
	} else {
		opt = option.WithCredentialsFile(credsEnv)
	}

	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, err
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}

	return authClient, nil
}
