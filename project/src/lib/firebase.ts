// Firebase setup for web app (migrated from React Native)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC22n0TfqG12ZHfXK6emzbLkdeDec2opvg",
  authDomain: "fastpiper-ca012.firebaseapp.com",
  databaseURL: "https://fastpiper-ca012-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fastpiper-ca012",
  storageBucket: "fastpiper-ca012.firebasestorage.app",
  messagingSenderId: "454574265841",
  appId: "1:454574265841:web:c1692c77d5bb17143a2050"
};
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const webClientId = '454574265841-kestf45c7d1jt3eepppj1nauakhv6ic6.apps.googleusercontent.com';

export function getFirebaseAuth() {
  return getAuth(firebaseApp);
}

export { GoogleAuthProvider }; 