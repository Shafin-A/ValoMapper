package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
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

type RSOAccountResponse struct {
	PUUID    string `json:"puuid"`
	GameName string `json:"gameName"`
	TagLine  string `json:"tagLine"`
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

var rsoAccountMeURLs = []string{
	"https://americas.api.riotgames.com/riot/account/v1/accounts/me",
	"https://europe.api.riotgames.com/riot/account/v1/accounts/me",
	"https://asia.api.riotgames.com/riot/account/v1/accounts/me",
}

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

func normalizeDisplayName(value string) string {
	trimmedValue := strings.TrimSpace(value)
	if trimmedValue == "" {
		return ""
	}

	parts := strings.SplitN(trimmedValue, "#", 2)
	if len(parts) != 2 {
		return trimmedValue
	}

	return buildGameTagDisplayName(parts[0], parts[1])
}

func getFirstStringValue(input map[string]any, keys ...string) string {
	for _, key := range keys {
		if value := getStringValue(input, key); value != "" {
			return value
		}
	}

	return ""
}

func nameFromAccountValue(acct any) string {
	switch value := acct.(type) {
	case string:
		return normalizeDisplayName(value)
	case map[string]any:
		if gameTagName := buildGameTagDisplayName(
			getFirstStringValue(value, "game_name", "gameName"),
			getFirstStringValue(value, "tag_line", "tagLine", "tagline"),
		); gameTagName != "" {
			return gameTagName
		}

		return normalizeDisplayName(getFirstStringValue(value, "name", "preferred_username", "nickname", "username"))
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

func decodeJWTClaims(jwtToken string) map[string]any {
	parts := strings.Split(jwtToken, ".")
	if len(parts) < 2 {
		return nil
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		paddedPayload := parts[1] + strings.Repeat("=", (4-len(parts[1])%4)%4)
		payload, err = base64.URLEncoding.DecodeString(paddedPayload)
		if err != nil {
			return nil
		}
	}

	claims := map[string]any{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil
	}

	return claims
}

func isRSODebugLoggingEnabled() bool {
	return true
}

func shortDebugValue(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "<empty>"
	}

	const maxLen = 64
	if len(trimmed) <= maxLen {
		return trimmed
	}

	return trimmed[:maxLen] + "..."
}

func summarizeAcctForDebug(acct any) string {
	switch value := acct.(type) {
	case nil:
		return "<missing>"
	case string:
		return fmt.Sprintf("string:%q", shortDebugValue(value))
	case map[string]any:
		return fmt.Sprintf(
			"object:game_name=%q tag_line=%q name=%q preferred_username=%q nickname=%q",
			shortDebugValue(getFirstStringValue(value, "game_name", "gameName")),
			shortDebugValue(getFirstStringValue(value, "tag_line", "tagLine", "tagline")),
			shortDebugValue(getFirstStringValue(value, "name", "username")),
			shortDebugValue(getFirstStringValue(value, "preferred_username", "preferredUsername")),
			shortDebugValue(getFirstStringValue(value, "nickname")),
		)
	default:
		return fmt.Sprintf("%T", acct)
	}
}

func summarizeIDTokenForDebug(idToken string) string {
	claims := decodeJWTClaims(idToken)
	if claims == nil {
		return "<unavailable>"
	}

	acctSummary := "<missing>"
	if acct, ok := claims["acct"]; ok {
		acctSummary = summarizeAcctForDebug(acct)
	}

	return fmt.Sprintf(
		"game_name=%q tag_line=%q name=%q preferred_username=%q nickname=%q acct=%s",
		shortDebugValue(getFirstStringValue(claims, "game_name", "gameName")),
		shortDebugValue(getFirstStringValue(claims, "tag_line", "tagLine", "tagline")),
		shortDebugValue(getFirstStringValue(claims, "name", "username")),
		shortDebugValue(getFirstStringValue(claims, "preferred_username", "preferredUsername")),
		shortDebugValue(getFirstStringValue(claims, "nickname")),
		acctSummary,
	)
}

func shortHashPrefix(value string) string {
	const prefixLength = 12
	if len(value) <= prefixLength {
		return value
	}

	return value[:prefixLength]
}

func extractNameFromIDToken(idToken string) string {
	claims := decodeJWTClaims(idToken)
	if claims == nil {
		return ""
	}

	if acct, ok := claims["acct"]; ok {
		if acctName := nameFromAccountValue(acct); acctName != "" {
			return acctName
		}
	}

	if gameTagName := buildGameTagDisplayName(
		getFirstStringValue(claims, "game_name", "gameName"),
		getFirstStringValue(claims, "tag_line", "tagLine", "tagline"),
	); gameTagName != "" {
		return gameTagName
	}

	return normalizeDisplayName(getFirstStringValue(claims, "name", "preferred_username", "preferredUsername", "nickname", "username"))
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

		if name := normalizeDisplayName(userInfo.Name); name != "" {
			return name
		}

		if preferredUsername := normalizeDisplayName(userInfo.PreferredUsername); preferredUsername != "" {
			return preferredUsername
		}

		if nickname := normalizeDisplayName(userInfo.Nickname); nickname != "" {
			return nickname
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

var getAccountInfoFromRSOFunc = getAccountInfoFromRSO

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

func getAccountInfoFromRSO(accessToken string) (*RSOAccountResponse, error) {
	client := &http.Client{}
	var lastErr error

	for _, accountURL := range rsoAccountMeURLs {
		req, err := http.NewRequest("GET", accountURL, nil)
		if err != nil {
			lastErr = err
			continue
		}

		req.Header.Set("Authorization", "Bearer "+accessToken)

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		var accountResp RSOAccountResponse
		decodeErr := json.NewDecoder(resp.Body).Decode(&accountResp)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("failed to get account info from RSO at %s: %v", accountURL, resp.Status)
			continue
		}

		if decodeErr != nil {
			lastErr = decodeErr
			continue
		}

		return &accountResp, nil
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("failed to get account info from RSO")
	}

	return nil, lastErr
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

	accountDisplayName := ""
	accountLookupStatus := "not_attempted"
	if displayName == "" {
		accountLookupStatus = "failed"
		accountInfo, accountErr := getAccountInfoFromRSOFunc(tokens.AccessToken)
		if accountErr == nil && accountInfo != nil {
			accountDisplayName = buildGameTagDisplayName(accountInfo.GameName, accountInfo.TagLine)
			if accountDisplayName != "" {
				displayName = accountDisplayName
				accountLookupStatus = "ok"
			}
		}
	}

	if isRSODebugLoggingEnabled() {
		log.Printf(
			"[request=%s] RSO debug: sub_hash_prefix=%s userinfo{game_name=%q tag_line=%q name=%q preferred_username=%q nickname=%q acct=%s} id_token{%s} account_me{status=%s display_name=%q} extracted_display_name=%q",
			middleware.GetRequestID(r),
			shortHashPrefix(hashedSub),
			shortDebugValue(userInfo.GameName),
			shortDebugValue(userInfo.TagLine),
			shortDebugValue(userInfo.Name),
			shortDebugValue(userInfo.PreferredUsername),
			shortDebugValue(userInfo.Nickname),
			summarizeAcctForDebug(userInfo.Acct),
			summarizeIDTokenForDebug(tokens.IDToken),
			accountLookupStatus,
			shortDebugValue(accountDisplayName),
			shortDebugValue(displayName),
		)
	}

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
