import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getDBConnection, setupDatabase, insertRecord, getPendingCount } from '../../database';

export default function CaptureScreen() {
  const [db, setDb] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Form State
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [location, setLocation] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await getDBConnection();
        await setupDatabase(database);
        setDb(database);
        
        const count = await getPendingCount(database);
        setPendingCount(count);
      } catch (error) {
        console.error("DB Error:", error);
      }
    };
    initDB();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const captureLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Faster GPS lock for rural areas
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      Alert.alert('Success', `Location captured:\n${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`);
    } catch (error) {
      console.error('Location Error:', error);
      Alert.alert('Error', 'Failed to get location.');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required.');
        return;
      }

      // Platform-specific photo capture
      let result;
      
      if (Platform.OS === 'web') {
        // Web: Use image library (file picker)
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        // Android/iOS: Use actual camera
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (!result.canceled) {
        console.log('📷 Photo captured:', result.assets[0].uri);
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera Error:', error);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const handleSubmit = async () => {
    if (!name || !phoneNumber || !problemStatement) {
      Alert.alert('Error', 'Please fill out all required fields.');
      return;
    }

    if (!db) {
      Alert.alert('Error', 'Database not ready.');
      return;
    }

    const newRecord = {
      id: uuidv4(),
      name,
      phone_number: phoneNumber,
      problem_statement: problemStatement,
      latitude: location?.latitude,
      longitude: location?.longitude,
      local_photo_uri: photoUri,
    };

    try {
      await insertRecord(db, newRecord);
      
      console.log('✅ Record inserted:', newRecord);
      
      // Clear form
      setName('');
      setPhoneNumber('');
      setProblemStatement('');
      setLocation(null);
      setPhotoUri(null);
      
      const count = await getPendingCount(db);
      setPendingCount(count);
      
      Alert.alert('Success', 'Survey data saved locally!');
    } catch (error) {
      console.error("Insert Error:", error);
      Alert.alert('Error', 'Failed to save data.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>New Survey Entry</Text>
        <View style={[styles.statusBadge, { backgroundColor: isOffline ? '#ef4444' : '#10b981' }]}>
          <Text style={styles.statusText}>{isOffline ? 'Offline' : 'Online'}</Text>
        </View>
      </View>

      {pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>📋 {pendingCount} entries pending sync</Text>
        </View>
      )}

      <View style={styles.form}>
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Patient Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        {/* Problem */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Healthcare Problem *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue in detail..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={problemStatement}
            onChangeText={setProblemStatement}
          />
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location (Optional)</Text>
          <TouchableOpacity style={styles.mediaButton} onPress={captureLocation}>
            <Text style={styles.mediaButtonText}>
              {location ? '✓ Location Captured' : '📍 Capture GPS Location'}
            </Text>
          </TouchableOpacity>
          {location && (
            <Text style={styles.locationText}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        {/* Photo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photo (Optional)</Text>
          <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
            <Text style={styles.mediaButtonText}>
              {photoUri 
                ? '✓ Photo Captured' 
                : Platform.OS === 'web' 
                  ? '📷 Choose Photo' 
                  : '📷 Take Photo'
              }
            </Text>
          </TouchableOpacity>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Save Survey Entry</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  pendingBanner: { backgroundColor: '#fef3c7', padding: 12, alignItems: 'center' },
  pendingText: { color: '#92400e', fontSize: 14, fontWeight: '600' },
  form: { padding: 16 },
  inputGroup: { marginBottom: 20, backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, color: '#0f172a' },
  textArea: { height: 100, textAlignVertical: 'top' },
  mediaButton: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center' },
  mediaButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  locationText: { marginTop: 8, fontSize: 12, color: '#64748b' },
  photoPreview: { width: '100%', height: 200, marginTop: 12, borderRadius: 8 },
  submitButton: { backgroundColor: '#10b981', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});