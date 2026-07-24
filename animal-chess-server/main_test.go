package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBuildHTTPHandler_RoutesWebSocketEndpoint(t *testing.T) {
	app := &App{Hub: NewHub()}
	handler, err := buildHTTPHandler(app)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	request := httptest.NewRequest(http.MethodGet, "/ws", nil)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code == http.StatusNotFound {
		t.Fatalf("expected /ws to be routed, got status %d", recorder.Code)
	}
}

func TestBuildHTTPHandler_UnknownPathReturnsNotFound(t *testing.T) {
	app := &App{Hub: NewHub()}
	handler, err := buildHTTPHandler(app)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	request := httptest.NewRequest(http.MethodGet, "/unknown", nil)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, recorder.Code)
	}
}
