package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"github.com/gorilla/mux"
)

func RegisterBillingRoutes(r *mux.Router) {
	billing := r.PathPrefix("/api/billing").Subrouter()

	billing.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandleStripeWebhook(w, r)
	}).Methods("POST")
}
