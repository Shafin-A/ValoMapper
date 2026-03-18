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

	billing.HandleFunc("/plans", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetBillingPlans(w, r)
	}).Methods("GET")

	billing.HandleFunc("/cancel-subscription", func(w http.ResponseWriter, r *http.Request) {
		handlers.CancelSubscription(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/resume-subscription", func(w http.ResponseWriter, r *http.Request) {
		handlers.ResumeSubscription(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandleStripeWebhook(w, r)
	}).Methods("POST")

	billing.HandleFunc("/stack/members", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetStackMembers(w, r, authClient)
	}).Methods("GET")

	billing.HandleFunc("/stack/invite", func(w http.ResponseWriter, r *http.Request) {
		handlers.InviteStackMember(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/stack/members/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
		handlers.RemoveStackMember(w, r, authClient)
	}).Methods("DELETE")

	billing.HandleFunc("/stack/accept/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
		handlers.AcceptStackInvite(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/stack/decline/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
		handlers.DeclineStackInvite(w, r, authClient)
	}).Methods("POST")

	billing.HandleFunc("/stack/leave", func(w http.ResponseWriter, r *http.Request) {
		handlers.LeaveStack(w, r, authClient)
	}).Methods("DELETE")

	billing.HandleFunc("/stack/pending-invites", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetPendingStackInvites(w, r, authClient)
	}).Methods("GET")
}
