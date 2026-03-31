import * as SQLite from 'expo-sqlite';

// Open (or create) the local database
export const getDBConnection = async () => {
  return await SQLite.openDatabaseAsync('healthcare.db');
};

// Initialize the table
export const setupDatabase = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS PendingRecords (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      problem_statement TEXT NOT NULL,
      sync_status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Insert a new record
export const insertRecord = async (db, record) => {
  const { id, name, phone_number, problem_statement } = record;
  return await db.runAsync(
    'INSERT INTO PendingRecords (id, name, phone_number, problem_statement, sync_status) VALUES (?, ?, ?, ?, ?)',
    [id, name, phone_number, problem_statement, 'PENDING']
  );
};

// --- NEW PHASE 2 FUNCTIONS ---

// Get all pending records that need to be synced
export const getPendingRecords = async (db) => {
  return await db.getAllAsync(
    'SELECT * FROM PendingRecords WHERE sync_status = ?',
    ['PENDING']
  );
};

// Delete synced records to clean up phone storage
export const deleteSyncedRecords = async (db, ids) => {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM PendingRecords WHERE id IN (${placeholders})`,
    ids
  );
};

// Get exact count of pending records for the UI
export const getPendingCount = async (db) => {
  const result = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM PendingRecords WHERE sync_status = ?',
    ['PENDING']
  );
  return result ? result.count : 0;
};