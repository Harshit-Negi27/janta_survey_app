import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { getDBConnection, setupDatabase, insertRecord, getPendingRecords, deleteSyncedRecords, getPendingCount } from '../../database';
import { supabase } from '../../supabase'; // We will create this file next!

export default function App() {
  const [db, setDb] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Form State
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [problemStatement, setProblemStatement] = useState('');

  // Initialize DB and Network Listener
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await getDBConnection();
        await setupDatabase(database);
        setDb(database);
        
        // Get initial pending count on load
        const count = await getPendingCount(database);
        setPendingCount(count);
      } catch (error) {
        console.error("DB Initialization Error:", error);
      }
    };
    initDB();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Helper to refresh the counter
  const updatePendingCount = async () => {
    if (db) {
      const count = await getPendingCount(db);
      setPendingCount(count);
    }
  };

  // Handle Form Submission
  const handleSubmit = async () => {
    if (!name || !phoneNumber || !problemStatement) {
      Alert.alert('Error', 'Please fill out all fields.');
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
    };

    try {
      await insertRecord(db, newRecord);
      
      // Clear form
      setName('');
      setPhoneNumber('');
      setProblemStatement('');
      
      // Instantly update the UI counter
      await updatePendingCount();
      
      Alert.alert(
        'Success', 
        isOffline 
          ? 'Data saved locally. It will sync when you are back online.' 
          : 'Data saved to local queue for syncing.'
      );
    } catch (error) {
      console.error("Insert Error:", error);
      Alert.alert('Error', 'Failed to save data.');
    }
  };

  // Phase 2: The Sync Engine
  const handleSync = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready.');
    if (isOffline) return Alert.alert('No Internet', 'Please connect to the internet to sync data.');

    setIsSyncing(true);

    try {
      // 1. Grab everything pending from SQLite
      const pendingRecords = await getPendingRecords(db);
      
      if (pendingRecords.length === 0) {
        Alert.alert('Info', 'No pending records to sync.');
        setIsSyncing(false);
        return;
      }

      // 2. Format it exactly how Supabase expects it
      const recordsToSync = pendingRecords.map(record => ({
        id: record.id,
        name: record.name,
        phone_number: record.phone_number,
        problem_statement: record.problem_statement,
        // Supabase will automatically handle the created_at timestamp
      }));

      // 3. Push to Cloud (Batch Insert)
      const { error } = await supabase
        .from('health_records')
        .insert(recordsToSync);

      if (error) throw error;

      // 4. If successful, clear the phone's local memory (Storage Cleanup)
      const syncedIds = pendingRecords.map(r => r.id);
      await deleteSyncedRecords(db, syncedIds);
      
      // 5. Update UI
      await updatePendingCount();
      Alert.alert('Sync Complete!', `Successfully pushed ${pendingRecords.length} record(s) to the cloud.`);

    } catch (error) {
      console.error('Sync Error:', error);
      Alert.alert('Sync Failed', 'An error occurred during sync. Check your Supabase configuration.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Village Health Capture</Text>
        <View style={[styles.statusBadge, { backgroundColor: isOffline ? '#ff4444' : '#00C851' }]}>
          <Text style={styles.statusText}>{isOffline ? 'Offline Mode' : 'Online'}</Text>
        </View>
      </View>

      {/* The New Sync Bar UI */}
      {pendingCount > 0 && (
        <View style={styles.syncBar}>
          <Text style={styles.pendingText}>{pendingCount} record(s) pending sync</Text>
          <TouchableOpacity 
            style={[styles.syncButton, (isOffline || isSyncing) && styles.syncButtonDisabled]} 
            onPress={handleSync}
            disabled={isSyncing || isOffline}
          >
            {isSyncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.syncButtonText}>Sync Now</Text>}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Patient Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe the healthcare problem..." multiline numberOfLines={4} value={problemStatement} onChangeText={setProblemStatement} />
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Save Data</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  syncBar: { backgroundColor: '#fff8dc', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  pendingText: { fontSize: 14, color: '#856404', fontWeight: '600' },
  syncButton: { backgroundColor: '#28a745', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  syncButtonDisabled: { backgroundColor: '#ccc' },
  syncButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  form: { padding: 20 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});