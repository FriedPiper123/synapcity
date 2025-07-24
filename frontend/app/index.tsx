import { useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from "react-native";
// import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Line } from 'react-native-svg';

export default function Page() {
  useEffect(() => {
    router.replace('/(tabs)');
  }, []);
  return null;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  main: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 960,
    
    marginHorizontal: "auto",
  },
  title: {
    fontSize: 64,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 36,
    color: "#38434D",
  },
});

