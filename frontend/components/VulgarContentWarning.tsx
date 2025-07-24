import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Surface, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface VulgarContentWarningProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message?: string;
  description?: string;
}

export default function VulgarContentWarning({ 
  visible, 
  onDismiss, 
  title = "⚠️ Content Warning",
  message = "Posting vulgar content is against our policy.",
  description = "Vulgarity is not allowed. Strict action will be taken if this happens again."
}: VulgarContentWarningProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={8}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={48} 
              color="#ef4444" 
            />
          </View>
          
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          
          <Text style={[styles.message, { color: theme.colors.onSurface }]}>
            {message}
          </Text>
          
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            {description}
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={onDismiss}
              style={[styles.button, { backgroundColor: '#ef4444' }]}
              textColor="white"
            >
              I Understand
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 4,
  },
}); 