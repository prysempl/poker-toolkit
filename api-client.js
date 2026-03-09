// ──────────────────────────────────────────────────
// Poker Toolkit — Frontend API Client
// Drop this file next to your React app
// ──────────────────────────────────────────────────

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

// ─── Token management ───
let authToken = null;

export function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("poker_token", token);
  } else {
    localStorage.removeItem("poker_token");
  }
}

export function getToken() {
  if (!authToken) {
    authToken = localStorage.getItem("poker_token");
  }
  return authToken;
}

// ─── Base fetch wrapper ───
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

// ──────────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────────

export async function signup(email, password) {
  const data = await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function getMe() {
  return apiFetch("/auth/me");
}

export function logout() {
  setToken(null);
}

// ──────────────────────────────────────────────────
// SUBSCRIPTIONS
// ──────────────────────────────────────────────────

// Creates a Stripe Checkout session and returns the URL
// Redirect the user to this URL to complete payment
export async function createCheckout(plan = "monthly") {
  const data = await apiFetch("/subscribe/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }), // "monthly" or "annual"
  });
  return data; // { url, sessionId }
}

// Opens the Stripe Customer Portal (manage/cancel subscription)
export async function openCustomerPortal() {
  const data = await apiFetch("/subscribe/portal", {
    method: "POST",
  });
  return data; // { url }
}

// Check subscription status
export async function getSubscriptionStatus() {
  return apiFetch("/subscribe/status");
  // Returns: { subscriptionStatus, isPro }
}
