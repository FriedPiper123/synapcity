import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Surface style={styles.container} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/" asChild>
          <Button mode="contained" style={styles.link}>
            Go to home screen!
          </Button>
        </Link>
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 8,
    width: 200,
  },
}); 