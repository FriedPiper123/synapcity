import { useEffect, useState, useCallback } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { firebaseApp, webClientId } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);

  const auth = getAuth(firebaseApp);

  // Google Sign-In
  const handleGoogleSignIn = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        client_id: webClientId,
      });
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      setIsAnonymous(result.user.isAnonymous);
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  }, [auth]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setIsAnonymous(true);
    // Optionally, sign in anonymously again
    signInAnonymously(auth).catch(console.error);
  }, [auth]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAnonymous(firebaseUser?.isAnonymous ?? true);
      setLoading(false);
      // If not signed in, sign in anonymously
      if (!firebaseUser) {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Token refresh logic
  useEffect(() => {
    let interval: number | null = null;
    async function setupTokenRefresh() {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        const refreshIn = Math.max(10, expiry - now - 60); // refresh 1 min before expiry
        if (interval) clearTimeout(interval);
        interval = window.setTimeout(async () => {
          await auth.currentUser?.getIdToken(true);
          setupTokenRefresh();
        }, refreshIn * 1000);
      }
    }
    setupTokenRefresh();
    return () => { if (interval) clearTimeout(interval); };
  }, [auth, user]);

  return {
    user,
    isAnonymous,
    loading,
    signInWithGoogle: handleGoogleSignIn,
    signOut: handleSignOut,
  };
} 