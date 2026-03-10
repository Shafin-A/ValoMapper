package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"
)

type RSOTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
	SubSID       string `json:"sub_sid"`
}

type RSOUserInfoResponse struct {
	Sub               string `json:"sub"`
	CPID              string `json:"cpid"`
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	Nickname          string `json:"nickname"`
	GameName          string `json:"game_name"`
	TagLine           string `json:"tag_line"`
	Acct              any    `json:"acct"`
}

type RSORequest struct {
	Code string `json:"code"`
}

type RSOConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	TokenURL     string
	UserinfoURL  string
}

var rsoConfig *RSOConfig

func InitializeRSOConfig(clientID, clientSecret, redirectURI string) {
	rsoConfig = &RSOConfig{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  redirectURI,
		TokenURL:     "https://auth.riotgames.com/token",
		UserinfoURL:  "https://auth.riotgames.com/userinfo",
	}
}

func hashRSOSub(sub string) string {
	hash := sha256.Sum256([]byte(sub))
	return fmt.Sprintf("%x", hash)
}

func buildGameTagDisplayName(gameName, tagLine string) string {
	trimmedGameName := strings.TrimSpace(gameName)
	trimmedTagLine := strings.TrimSpace(tagLine)
	if trimmedGameName == "" || trimmedTagLine == "" {
		return ""
	}

	return fmt.Sprintf("%s#%s", trimmedGameName, trimmedTagLine)
}

func nameFromAccountValue(acct any) string {
	switch value := acct.(type) {
	case string:
		parts := strings.SplitN(strings.TrimSpace(value), "#", 2)
		if len(parts) != 2 {
			return ""
		}
		return buildGameTagDisplayName(parts[0], parts[1])
	case map[string]any:
		return buildGameTagDisplayName(
			getStringValue(value, "game_name"),
			getStringValue(value, "tag_line"),
		)
	default:
		return ""
	}
}

func getStringValue(input map[string]any, key string) string {
	value, ok := input[key]
	if !ok {
		return ""
	}

	stringValue, ok := value.(string)
	if !ok {
		return ""
	}

	return strings.TrimSpace(stringValue)
}

func extractNameFromIDToken(idToken string) string {
	parts := strings.Split(idToken, ".")
	if len(parts) < 2 {
		return ""
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		paddedPayload := parts[1] + strings.Repeat("=", (4-len(parts[1])%4)%4)
		payload, err = base64.URLEncoding.DecodeString(paddedPayload)
		if err != nil {
			return ""
		}
	}

	claims := map[string]any{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}

	if acct, ok := claims["acct"]; ok {
		if acctName := nameFromAccountValue(acct); acctName != "" {
			return acctName
		}
	}

	return buildGameTagDisplayName(
		getStringValue(claims, "game_name"),
		getStringValue(claims, "tag_line"),
	)
}

func extractRSODisplayName(userInfo *RSOUserInfoResponse, idToken string) string {
	if userInfo != nil {
		displayName := buildGameTagDisplayName(userInfo.GameName, userInfo.TagLine)
		if displayName != "" {
			return displayName
		}

		if acctName := nameFromAccountValue(userInfo.Acct); acctName != "" {
			return acctName
		}
	}

	return extractNameFromIDToken(idToken)
}

var exchangeCodeForTokensFunc = exchangeCodeForTokens

func exchangeCodeForTokens(code string) (*RSOTokenResponse, error) {
	if rsoConfig == nil || rsoConfig.ClientID == "" {
		return nil, fmt.Errorf("RSO not configured")
	}

	formData := url.Values{}
	formData.Set("grant_type", "authorization_code")
	formData.Set("code", code)
	formData.Set("redirect_uri", rsoConfig.RedirectURI)

	req, err := http.NewRequest("POST", rsoConfig.TokenURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(rsoConfig.ClientID + ":" + rsoConfig.ClientSecret))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tokenResp RSOTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to exchange code for tokens: %v", resp.Status)
	}

	return &tokenResp, nil
}

var getUserInfoFromRSOFunc = getUserInfoFromRSO

func getUserInfoFromRSO(accessToken string) (*RSOUserInfoResponse, error) {
	req, err := http.NewRequest("GET", rsoConfig.UserinfoURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var userInfo RSOUserInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info from RSO: %v", resp.Status)
	}

	return &userInfo, nil
}

func HandleRSOCallback(w http.ResponseWriter, r *http.Request, firebaseAuth FirebaseAuthInterface) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, utils.NewBadRequest("Method not allowed"), middleware.GetRequestID(r))
		return
	}

	var req RSORequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, utils.NewBadRequest("Invalid request body"), middleware.GetRequestID(r))
		return
	}
	defer r.Body.Close()

	if req.Code == "" {
		utils.SendJSONError(w, utils.NewBadRequest("Missing authorization code"), middleware.GetRequestID(r))
		return
	}

	tokens, err := exchangeCodeForTokensFunc(req.Code)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Failed to exchange authorization code"), middleware.GetRequestID(r))
		return
	}

	userInfo, err := getUserInfoFromRSOFunc(tokens.AccessToken)
	if err != nil {
		utils.SendJSONError(w, utils.NewUnauthorized("Failed to retrieve user info from RSO"), middleware.GetRequestID(r))
		return
	}

	hashedSub := hashRSOSub(userInfo.Sub)
	displayName := extractRSODisplayName(userInfo, tokens.IDToken)

	var namePtr *string
	if displayName != "" {
		namePtr = &displayName
	}

	user, err := models.GetUserByRSOSubject(hashedSub)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to query RSO user", err), middleware.GetRequestID(r))
		return
	}

	if user == nil {
		user, err = models.CreateUserWithRSO(hashedSub, hashedSub, namePtr, tokens.AccessToken, tokens.RefreshToken, tokens.IDToken)
		if err != nil {
			utils.SendJSONError(w, utils.NewInternal("Failed to create RSO user", err), middleware.GetRequestID(r))
			return
		}
	} else {
		if namePtr != nil && (user.Name == nil || strings.TrimSpace(*user.Name) != *namePtr) {
			_ = user.UpdateName(*namePtr)
		}

		if user.FirebaseUID == nil || *user.FirebaseUID == "" {
			if err := user.SetFirebaseUID(hashedSub); err != nil {
				utils.SendJSONError(w, utils.NewInternal("Failed to link RSO user with firebase uid", err), middleware.GetRequestID(r))
				return
			}
		}
		_ = user.UpdateRSOTokens(tokens.AccessToken, tokens.RefreshToken)
	}

	customToken, err := firebaseAuth.CustomToken(context.Background(), hashedSub)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to create firebase custom token", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, map[string]any{
		"customToken": customToken,
		"user":        user,
	}, middleware.GetRequestID(r))
}
