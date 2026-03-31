import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.brandingBox}>
        <Text style={styles.appTitle}>JANTA SURVEY APP</Text>
        <Text style={styles.byLine}>by</Text>
        <Text style={styles.companyName}>ZANTA TECH</Text>
      </View>

      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.startButtonText}>Start Survey</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Offline-First Healthcare Data Collection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  brandingBox: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  byLine: {
    fontSize: 14,
    color: '#94a3b8',
    marginVertical: 8,
  },
  companyName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 3,
  },
  startButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    color: '#64748b',
    fontSize: 12,
  },
});