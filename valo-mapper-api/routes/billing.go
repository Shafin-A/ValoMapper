package routes

import (
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterBillingRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	billing := r.PathPrefix("/api/billing").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	billing.Handle("/checkout-session", authenticated(authClient, handlers.CreateCheckoutSession)).Methods("POST")

	billing.HandleFunc("/plans", handlers.GetBillingPlans).Methods("GET")

	billing.Handle("/cancel-subscription", authenticated(authClient, handlers.CancelSubscription)).Methods("POST")
	billing.Handle("/resume-subscription", authenticated(authClient, handlers.ResumeSubscription)).Methods("POST")

	billing.HandleFunc("/webhook", handlers.HandleStripeWebhook).Methods("POST")

	billing.Handle("/stack/members", authenticated(authClient, handlers.GetStackMembers)).Methods("GET")
	billing.Handle("/stack/invite", authenticated(authClient, handlers.InviteStackMember)).Methods("POST")
	billing.Handle("/stack/members/{id:[0-9]+}", authenticated(authClient, handlers.RemoveStackMember)).Methods("DELETE")
	billing.Handle("/stack/accept/{id:[0-9]+}", authenticated(authClient, handlers.AcceptStackInvite)).Methods("POST")
	billing.Handle("/stack/decline/{id:[0-9]+}", authenticated(authClient, handlers.DeclineStackInvite)).Methods("POST")
	billing.Handle("/stack/leave", authenticated(authClient, handlers.LeaveStack)).Methods("DELETE")
	billing.Handle("/stack/pending-invites", authenticated(authClient, handlers.GetPendingStackInvites)).Methods("GET")
}
