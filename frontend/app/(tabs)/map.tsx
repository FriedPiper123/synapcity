import { InsightsMapView } from '../../components/InsightsMapView';
import { View, StyleSheet } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <InsightsMapView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 100, // Add bottom padding
  },
}); 