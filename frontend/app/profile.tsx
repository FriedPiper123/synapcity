import { useRouter } from 'expo-router';
import * as React from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, HelperText, Text, TextInput, useTheme, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInAnonymously, onAuthStateChanged, signOut, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebaseConfig';

const AVATAR_OPTIONS = [
  { label: 'Professional', value: 'account-tie' },
  { label: 'Engineer', value: 'account-wrench' },
  { label: 'Community', value: 'home-city' },
  { label: 'Artist', value: 'palette' },
];

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_details';

export async function persistAuthCredentials(token: string, userDetails: any) {
  // Parse expiry from JWT
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiry = payload.exp;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem('auth_token_expiry', String(expiry));
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(userDetails));
}

export default function ProfilePage() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('Ayush Bisht');
  const [avatar, setAvatar] = useState('account-tie');
  const [nameError, setNameError] = useState('');
  const [user, setUser] = useState({
    displayName: 'Ayush Bisht',
    email: 'ayushbisht21122001@gmail.com',
    uid: 'imRF2XipVzWmY0JySPwFAGwNnr02',
    photoURL: undefined,
  });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImE4ZGY2MmQzYTBhNDRlM2RmY2RjYWZjNmRhMTM4Mzc3NDU5ZjliMDEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiQXl1c2ggQmlzaHQiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSl9jWUhWc1AyRU5VNFpZYjRUdXZCbFNQaU9hNjNKb1NHXzBLUXBONmFGOE1ZbmFBPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2ZyaWVkcGlwZXI0MDQiLCJhdWQiOiJmcmllZHBpcGVyNDA0IiwiYXV0aF90aW1lIjoxNzUzMDQyMjk4LCJ1c2VyX2lkIjoiQ2VqbkhTcFRWaE9KbTQ0UDZtYkpES00wWUc2MyIsInN1YiI6IkNlam5IU3BUVmhPSm00NFA2bWJKREtNMFlHNjMiLCJpYXQiOjE3NTMwNDIyOTgsImV4cCI6MTc1MzA0NTg5OCwiZW1haWwiOiJheXVzaGJpc2h0MjExMjIwMDFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTE4MDcxNTA5MDk3NTk3NTYyMjQiXSwiZW1haWwiOlsiYXl1c2hiaXNodDIxMTIyMDAxQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.CkTT8mxYmomKg9q6dd5_L6Cs_ygFgHiHOSHZcwuxxJHU_F1RKfggUl_c76eMA1AQ04k-pIeL8ESOrhfCzlqUIGNYgjgqFE75N3vJH1AxguBCEh4YFhq15bELdV2SYb2eRrDKBTT4pGHxzxECId45TzhUrHmvd30rwDqN7sYi6lGqKvaL0ng94In8FREXDZh9Z03QCpzfvlqG9iHEzSLBvTJBTWNnBcpUMgU_3-rXtfufwaL2d8w_4V0uyUWA3ZtMtnQo_ehyBAxyIiKCoSRB8k_IgYs1zQDNP6KP_gpQN7sq1hSdvr-q3F4o4T7aAIu4bh-R04jAi-aWmjH22tFZEQ";
  const userDetails = {
    Name: "Ayush Bisht",
    Email: "ayushbisht21122001@gmail.com",
    UID: "imRF2XipVzWmY0JySPwFAGwNnr02"
  };

  React.useEffect(() => {
    // Configure Google Signin
    GoogleSignin.configure({
      webClientId: '454574265841-kestf45c7d1jt3eepppj1nauakhv6ic6.apps.googleusercontent.com', // TODO: Replace with your web client ID
      offlineAccess: true,
    });
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAnonymous(user?.isAnonymous ?? true);
      setCheckingAuth(false);
      // Remove auto-redirect to dashboard here
      // if (user && !user.isAnonymous) {
      //   router.replace('/(tabs)');
      // }
    });
    // Sign in anonymously if not signed in
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(console.error);
    }
    return () => unsubscribe();
  }, []);

  // Add effect to auto-refresh token
  React.useEffect(() => {
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
          const newToken = await auth.currentUser?.getIdToken(true);
          if (newToken) {
            await persistAuthCredentials(newToken, user);
          }
          setupTokenRefresh();
        }, refreshIn * 1000);
      }
    }
    setupTokenRefresh();
    return () => { if (interval) clearTimeout(interval); };
  }, [firebaseUser]);

  const handleGoogleSignIn = async () => {
    try {
      // await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      console.log(response);
      const googleCredential = GoogleAuthProvider.credential(response.data?.idToken);
      await signInWithCredential(auth, googleCredential);
      // Persist token and expiry
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        await persistAuthCredentials(token, user);
      }
      // Redirect to dashboard after login
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setIsAnonymous(true);
    // Optionally, sign in anonymously again
    signInAnonymously(auth).catch(console.error);
    router.replace('/');
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setNameError(text.trim() ? '' : 'Name is required');
  };

  return (
    <View style={styles.container}>
      {/* Back button at top left */}
      <IconButton
        icon="arrow-left"
        size={28}
        style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}
        onPress={() => router.replace('/(tabs)')}
        accessibilityLabel="Back to Dashboard"
      />
      <Card style={styles.card}>
        <Card.Content style={{ alignItems: 'center' }}>
          <Avatar.Icon size={80} icon={avatar} style={{ backgroundColor: theme.colors.primary }} />
          <Text variant="titleLarge" style={{ marginTop: 16, fontWeight: 'bold', color: theme.colors.onSurface }}>
            Profile
          </Text>
          {/* Show Google Sign-In if anonymous */}
          {isAnonymous ? (
            <Button
              mode="contained"
              icon="google"
              style={{ marginTop: 24, backgroundColor: '#fff', borderColor: '#4285F4', borderWidth: 1 }}
              labelStyle={{ color: '#4285F4', fontWeight: 'bold' }}
              onPress={handleGoogleSignIn}
            >
              Sign in with Google
            </Button>
          ) : (
            <>
              <TextInput
                label="Name"
                value={name}
                onChangeText={handleNameChange}
                style={styles.input}
                mode="outlined"
                error={!!nameError}
                autoCapitalize="words"
              />
              <HelperText type="error" visible={!!nameError}>{nameError}</HelperText>
              <Text style={{ marginTop: 16, marginBottom: 8, color: theme.colors.onSurfaceVariant }}>Avatar</Text>
              <View style={styles.avatarOptionsRow}>
                {AVATAR_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    mode={avatar === opt.value ? 'contained' : 'outlined'}
                    icon={opt.value}
                    onPress={() => setAvatar(opt.value)}
                    style={styles.avatarOptionBtn}
                    compact
                  >
                    {opt.label}
                  </Button>
                ))}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      {/* Show sign out only if not anonymous */}
      {!isAnonymous && (
        <Button mode="contained" style={styles.signOutButton} onPress={handleSignOut}>
          Sign Out
        </Button>
      )}
      {/* Remove Go to Dashboard button */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
    borderRadius: 16,
    elevation: 2,
  },
  input: {
    width: '100%',
    marginTop: 16,
  },
  avatarOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  avatarOptionBtn: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  signOutButton: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    paddingVertical: 6,
  },
}); 