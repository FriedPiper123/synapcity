// API utility for web app (migrated from React Native)
// Handles token management and attaches Firebase token to requests

import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase';

const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

// Utility to get a valid token, refreshing if needed
export async function getValidToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  let expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const now = Math.floor(Date.now() / 1000);

  // If no token or expired/about to expire, refresh
  if (!token || !expiry || Number(expiry) - now < 120) {
    const auth = getAuth(firebaseApp);
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken(true);
      // Parse expiry from JWT
      const payload = JSON.parse(atob(token.split('.')[1]));
      expiry = payload.exp;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
    } else {
      throw new Error('No authenticated user');
    }
  }
  return token;
}

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await getValidToken();
  const headers = {
    ...(init.headers || {}),
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  return fetch(input, { ...init, headers });
} 