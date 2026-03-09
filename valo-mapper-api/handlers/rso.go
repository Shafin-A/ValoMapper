package handlers

import (
	"context"
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
	Sub  string `json:"sub"`
	CPID string `json:"cpid"`
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

	log.Printf("RSO userInfo: sub=%q, cpid=%q", userInfo.Sub, userInfo.CPID)

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

	user, err := models.GetUserByRSOSubject(userInfo.Sub)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to query RSO user", err), middleware.GetRequestID(r))
		return
	}

	if user == nil {
		user, err = models.CreateUserWithRSO(userInfo.Sub, tokens.AccessToken, tokens.RefreshToken, tokens.IDToken)
		if err != nil {
			utils.SendJSONError(w, utils.NewInternal("Failed to create RSO user", err), middleware.GetRequestID(r))
			return
		}
	} else {
		_ = user.UpdateRSOTokens(tokens.AccessToken, tokens.RefreshToken)
	}

	customToken, err := firebaseAuth.CustomToken(context.Background(), userInfo.Sub)
	if err != nil {
		utils.SendJSONError(w, utils.NewInternal("Failed to create firebase custom token", err), middleware.GetRequestID(r))
		return
	}

	utils.SendJSON(w, http.StatusOK, map[string]any{
		"customToken": customToken,
		"user":        user,
	}, middleware.GetRequestID(r))
}
