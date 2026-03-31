import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getDBConnection, getPendingRecords, deleteSyncedRecords, updateRecord } from '../../database';
import { supabase, uploadPhotoToStorage } from '../../supabase';
import * as FileSystem from 'expo-file-system';

export default function QueueScreen() {
  const [db, setDb] = useState(null);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProblem, setEditProblem] = useState('');

  useEffect(() => {
    const initDB = async () => {
      const database = await getDBConnection();
      setDb(database);
      loadPendingRecords(database);
    };
    initDB();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const loadPendingRecords = async (database = db) => {
    if (!database) return;
    const records = await getPendingRecords(database);
    setPendingRecords(records);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPendingRecords();
    setRefreshing(false);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditName(record.name);
    setEditPhone(record.phone_number);
    setEditProblem(record.problem_statement);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editName || !editPhone || !editProblem) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    try {
      await updateRecord(db, editingRecord.id, {
        name: editName,
        phone_number: editPhone,
        problem_statement: editProblem,
        latitude: editingRecord.latitude,
        longitude: editingRecord.longitude,
        local_photo_uri: editingRecord.local_photo_uri,
      });

      Alert.alert('Success', 'Record updated');
      setEditModalVisible(false);
      loadPendingRecords();
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update record');
    }
  };

  const handleSync = async () => {
    if (isOffline) {
      Alert.alert('No Internet', 'Connect to internet to sync');
      return;
    }

    if (pendingRecords.length === 0) {
      Alert.alert('Info', 'No records to sync');
      return;
    }

    setIsSyncing(true);

    try {
      const successfulSyncs = [];

      for (const record of pendingRecords) {
        let photoUrl = null;

        // Upload photo if exists
        // Upload photo if exists
        if (record.local_photo_uri) {
           console.log('🖼️ Photo URI being uploaded:', record.local_photo_uri);
           photoUrl = await uploadPhotoToStorage(record.local_photo_uri, record.id);
  
           if (!photoUrl) {
               console.warn(`Photo upload failed for ${record.id}`);
  }
}
        

        // Insert to Supabase
        const { error } = await supabase
          .from('health_records')
          .insert({
            id: record.id,
            name: record.name,
            phone_number: record.phone_number,
            problem_statement: record.problem_statement,
            latitude: record.latitude,
            longitude: record.longitude,
            photo_url: photoUrl,
            created_at: record.created_at,
          });

        if (!error) {
          successfulSyncs.push(record.id);
          
          // Delete local photo file
          if (record.local_photo_uri) {
            try {
              await FileSystem.deleteAsync(record.local_photo_uri, { idempotent: true });
            } catch (err) {
              console.warn('Failed to delete local photo:', err);
            }
          }
        } else {
          console.error('Supabase insert error:', error);
        }
      }

      // Delete synced records from SQLite
      if (successfulSyncs.length > 0) {
        await deleteSyncedRecords(db, successfulSyncs);
        await loadPendingRecords();
        
        Alert.alert(
          'Sync Complete',
          `${successfulSyncs.length} of ${pendingRecords.length} records synced successfully!`
        );
      } else {
        Alert.alert('Sync Failed', 'No records were synced. Please check your connection.');
      }

    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderRecord = ({ item }) => (
    <TouchableOpacity style={styles.recordCard} onPress={() => openEditModal(item)}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordName}>{item.name}</Text>
        <Text style={styles.recordPhone}>{item.phone_number}</Text>
      </View>
      <Text style={styles.recordProblem} numberOfLines={2}>{item.problem_statement}</Text>
      <View style={styles.recordFooter}>
        {item.latitude && <Text style={styles.badge}>📍 GPS</Text>}
        {item.local_photo_uri && <Text style={styles.badge}>📷 Photo</Text>}
        <Text style={styles.recordDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerText}>Pending Queue</Text>
          <Text style={styles.headerSubtext}>{pendingRecords.length} entries</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isOffline ? '#ef4444' : '#10b981' }]}>
          <Text style={styles.statusText}>{isOffline ? 'Offline' : 'Online'}</Text>
        </View>
      </View>

      {pendingRecords.length > 0 && (
        <View style={styles.syncBar}>
          <TouchableOpacity 
            style={[styles.syncButton, (isSyncing || isOffline) && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={isSyncing || isOffline}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.syncButtonText}>🔄 Sync All to Cloud</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={pendingRecords}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>✓ No pending entries</Text>
            <Text style={styles.emptySubtext}>All surveys are synced!</Text>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Edit Entry</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Problem</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editProblem}
                onChangeText={setEditProblem}
                multiline
                numberOfLines={4}
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={saveEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  headerSubtext: { fontSize: 14, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  syncBar: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  syncButton: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' },
  syncButtonDisabled: { backgroundColor: '#cbd5e1' },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  listContent: { padding: 16 },
  recordCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recordName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  recordPhone: { fontSize: 14, color: '#64748b' },
  recordProblem: { fontSize: 14, color: '#334155', marginBottom: 8 },
  recordFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { fontSize: 11, color: '#3b82f6', backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  recordDate: { fontSize: 12, color: '#94a3b8', marginLeft: 'auto' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#64748b', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#0f172a' },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, color: '#0f172a' },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f5f9' },
  saveButton: { backgroundColor: '#10b981' },
  cancelButtonText: { color: '#64748b', fontWeight: '600' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
});