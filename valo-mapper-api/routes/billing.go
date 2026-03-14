package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterBillingRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	billing := r.PathPrefix("/api/billing").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	billing.HandleFunc("/checkout-session", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateCheckoutSession(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/cancel-subscription", func(w http.ResponseWriter, r *http.Request) {
		handlers.CancelSubscription(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/resume-subscription", func(w http.ResponseWriter, r *http.Request) {
		handlers.ResumeSubscription(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandleStripeWebhook(w, r)
	}).Methods("POST")
}
