package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTokenService_IssueAndParsePreservesOpenID(t *testing.T) {
	service := NewTokenService("test-secret")

	token, err := service.Issue(UserClaims{UserID: 1, OpenID: "openid-1"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	claims, err := service.Parse(token)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if claims.OpenID != "openid-1" {
		t.Fatalf("expected openid %q, got %q", "openid-1", claims.OpenID)
	}
}

func TestTokenService_IssueFailsWhenSecretMissing(t *testing.T) {
	service := NewTokenService("")

	_, err := service.Issue(UserClaims{UserID: 1, OpenID: "openid-1"})
	if err != ErrTokenSigningSecretMissing {
		t.Fatalf("expected error %v, got %v", ErrTokenSigningSecretMissing, err)
	}
}

func TestTokenService_ParseFailsWhenSecretMissing(t *testing.T) {
	service := NewTokenService("")

	_, err := service.Parse("token")
	if err != ErrTokenSigningSecretMissing {
		t.Fatalf("expected error %v, got %v", ErrTokenSigningSecretMissing, err)
	}
}

func TestTokenService_ParseFailsWithWrongSecret(t *testing.T) {
	issuedBy := NewTokenService("right-secret")
	parsedBy := NewTokenService("wrong-secret")

	token, err := issuedBy.Issue(UserClaims{UserID: 1, OpenID: "openid-1"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	_, err = parsedBy.Parse(token)
	if err == nil {
		t.Fatal("expected parse error, got nil")
	}
}

func TestTokenService_ParseFailsForTamperedToken(t *testing.T) {
	service := NewTokenService("test-secret")

	token, err := service.Issue(UserClaims{UserID: 1, OpenID: "openid-1"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	_, err = service.Parse(token + "tampered")
	if err == nil {
		t.Fatal("expected parse error, got nil")
	}
}

func TestExtractBearerTokenFailsWhenAuthorizationMissing(t *testing.T) {
	_, err := extractBearerToken("")
	if err != ErrAuthorizationHeaderMissing {
		t.Fatalf("expected error %v, got %v", ErrAuthorizationHeaderMissing, err)
	}
}

func TestExtractBearerTokenFailsWhenPrefixInvalid(t *testing.T) {
	_, err := extractBearerToken("Token abc")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestExtractBearerTokenFailsWhenBearerTokenMissing(t *testing.T) {
	_, err := extractBearerToken("Bearer   ")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestAuthMiddlewareReturnsJSONWhenUnauthorized(t *testing.T) {
	service := NewTokenService("test-secret")
	handler := AuthMiddleware(service)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	request := httptest.NewRequest(http.MethodGet, "/ws", nil)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, recorder.Code)
	}
	if recorder.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("expected content type %q, got %q", "application/json", recorder.Header().Get("Content-Type"))
	}
	if recorder.Body.String() != "{\"error\":\"unauthorized\"}\n" {
		t.Fatalf("expected JSON body, got %q", recorder.Body.String())
	}
}
