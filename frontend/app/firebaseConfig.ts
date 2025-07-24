// Firebase config and initialization for React Native frontend
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyC22n0TfqG12ZHfXK6emzbLkdeDec2opvg",
  authDomain: "fastpiper-ca012.firebaseapp.com",
  projectId: "fastpiper-ca012",
  storageBucket: "fastpiper-ca012.firebasestorage.app",
  messagingSenderId: "454574265841",
  appId: "1:454574265841:web:247ac61ee23acaac3a2050"
};

// Initialize Firebase only once
export const app = getApps().length ? getApp()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app); 