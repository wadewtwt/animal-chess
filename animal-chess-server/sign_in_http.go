package main

import (
	"log"
	"net/http"
	"time"
)

func RegisterSignInRoutes(mux *http.ServeMux, app *App) {
	if app == nil || app.SignInService == nil || app.TokenService == nil {
		return
	}

	authMiddleware := AuthMiddleware(app.TokenService)
	mux.Handle("/api/sign-in/status", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handleSignInStatus(app, w, r)
	})))
	mux.Handle("/api/sign-in", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handleSignIn(app, w, r)
	})))
	mux.Handle("/api/points/summary", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlePointsSummary(app, w, r)
	})))
	mux.Handle("/api/animal-chess/check-in", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handleAnimalChessCheckIn(app, w, r)
	})))
	mux.Handle("/api/animal-chess/checkin/weekly-summary", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handleAnimalChessWeeklySummary(app, w, r)
	})))
}

func handleSignInStatus(app *App, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		log.Printf("SignInHTTP handleSignInStatus error invalid method: method=%s", r.Method)
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if app.DB == nil {
		log.Printf("SignInHTTP handleSignInStatus error database not initialized")
		writeJSONError(w, http.StatusInternalServerError, "database not initialized")
		return
	}

	claims, ok := GetUserClaims(r)
	if !ok {
		log.Printf("SignInHTTP handleSignInStatus error user claims missing")
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	status, err := app.SignInService.GetStatus(claims.UserID, time.Now().Format(dateLayout))
	if err != nil {
		log.Printf("SignInHTTP handleSignInStatus error load status failed, userID=%d: %v", claims.UserID, err)
		writeJSONError(w, http.StatusInternalServerError, "failed to load sign-in status")
		return
	}

	writeJSON(w, http.StatusOK, status)
}

func handleSignIn(app *App, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Printf("SignInHTTP handleSignIn error invalid method: method=%s", r.Method)
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if app.DB == nil {
		log.Printf("SignInHTTP handleSignIn error database not initialized")
		writeJSONError(w, http.StatusInternalServerError, "database not initialized")
		return
	}

	claims, ok := GetUserClaims(r)
	if !ok {
		log.Printf("SignInHTTP handleSignIn error user claims missing")
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	result, err := app.SignInService.SignIn(SignInCommand{
		UserID: claims.UserID,
		Today:  time.Now().Format(dateLayout),
	})
	if err != nil {
		log.Printf("SignInHTTP handleSignIn error sign in failed, userID=%d: %v", claims.UserID, err)
		writeJSONError(w, http.StatusInternalServerError, "failed to sign in")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func handlePointsSummary(app *App, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		log.Printf("SignInHTTP handlePointsSummary error invalid method: method=%s", r.Method)
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if app.DB == nil {
		log.Printf("SignInHTTP handlePointsSummary error database not initialized")
		writeJSONError(w, http.StatusInternalServerError, "database not initialized")
		return
	}

	claims, ok := GetUserClaims(r)
	if !ok {
		log.Printf("SignInHTTP handlePointsSummary error user claims missing")
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	summary, err := app.SignInService.GetPointsSummary(claims.UserID, time.Now().Format(dateLayout))
	if err != nil {
		log.Printf("SignInHTTP handlePointsSummary error load summary failed, userID=%d: %v", claims.UserID, err)
		writeJSONError(w, http.StatusInternalServerError, "failed to load points summary")
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

func handleAnimalChessCheckIn(app *App, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Printf("SignInHTTP handleAnimalChessCheckIn error invalid method: method=%s", r.Method)
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if app.DB == nil {
		log.Printf("SignInHTTP handleAnimalChessCheckIn error database not initialized")
		writeJSONError(w, http.StatusInternalServerError, "database not initialized")
		return
	}

	claims, ok := GetUserClaims(r)
	if !ok {
		log.Printf("SignInHTTP handleAnimalChessCheckIn error user claims missing")
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if claims.UserID <= 0 {
		log.Printf("SignInHTTP handleAnimalChessCheckIn error invalid user id in context: userID=%d", claims.UserID)
		writeJSONError(w, http.StatusInternalServerError, "Invalid user ID in context")
		return
	}

	today := time.Now().Format(dateLayout)
	result, err := app.SignInService.SignIn(SignInCommand{
		UserID: claims.UserID,
		Today:  today,
	})
	if err != nil {
		log.Printf("SignInHTTP handleAnimalChessCheckIn error failed to persist check-in, userID=%d: %v", claims.UserID, err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to persist check-in")
		return
	}
	if !result.Awarded && result.SignedToday {
		log.Printf("SignInHTTP handleAnimalChessCheckIn error already checked in today, userID=%d", claims.UserID)
		writeJSONError(w, http.StatusBadRequest, "already checked in today")
		return
	}

	writeJSON(w, http.StatusOK, &CheckInResponse{
		Success:       true,
		CheckInDate:   today,
		StreakDays:    result.WeekContinuousDays,
		AwardedPoints: result.RewardPoints,
	})
}

func handleAnimalChessWeeklySummary(app *App, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		log.Printf("SignInHTTP handleAnimalChessWeeklySummary error invalid method: method=%s", r.Method)
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if app.DB == nil {
		log.Printf("SignInHTTP handleAnimalChessWeeklySummary error database not initialized")
		writeJSONError(w, http.StatusInternalServerError, "database not initialized")
		return
	}

	claims, ok := GetUserClaims(r)
	if !ok {
		log.Printf("SignInHTTP handleAnimalChessWeeklySummary error user claims missing")
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if claims.UserID <= 0 {
		log.Printf("SignInHTTP handleAnimalChessWeeklySummary error invalid user id in context: userID=%d", claims.UserID)
		writeJSONError(w, http.StatusInternalServerError, "Invalid user ID in context")
		return
	}

	summary, err := app.SignInService.GetWeeklySummary(claims.UserID, time.Now().Format(dateLayout))
	if err != nil {
		log.Printf("SignInHTTP handleAnimalChessWeeklySummary error failed to query weekly summary, userID=%d: %v", claims.UserID, err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to query weekly summary")
		return
	}

	writeJSON(w, http.StatusOK, summary)
}
