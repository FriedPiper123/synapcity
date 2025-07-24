import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebaseConfig';
import { getIdToken, onIdTokenChanged } from 'firebase/auth';

// Utility to get a valid token, refreshing if needed
export async function getValidToken() {
  // Try to get token from AsyncStorage
  let token = await AsyncStorage.getItem('auth_token');
  let expiry = await AsyncStorage.getItem('auth_token_expiry');
  const now = Math.floor(Date.now() / 1000);

  // If no token or expired/about to expire, refresh
  if (!token || !expiry || Number(expiry) - now < 120) { // refresh if <2min left
    if (auth.currentUser) {
      token = await getIdToken(auth.currentUser, true);
      // Parse expiry from JWT
      const payload = JSON.parse(atob(token.split('.')[1]));
      expiry = payload.exp;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('auth_token_expiry', String(expiry));
    } else {
      // Not signed in, fallback to anonymous or error
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

// Default export to fix the route warning
export default function ApiRoute() {
  return null;
} 