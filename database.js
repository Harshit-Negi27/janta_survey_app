import * as SQLite from 'expo-sqlite';

// Open (or create) the local database
export const getDBConnection = async () => {
  return await SQLite.openDatabaseAsync('healthcare.db');
};

// Initialize the table with NEW fields for location and photo
// Initialize the table with NEW fields for location and photo
export const setupDatabase = async (db) => {
  // Create table if it doesn't exist (original schema)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS PendingRecords (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      problem_statement TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      local_photo_uri TEXT,
      sync_status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safely add new columns if they don't exist yet
  const addColumnIfMissing = async (col, type) => {
    try {
      await db.execAsync(`ALTER TABLE PendingRecords ADD COLUMN ${col} ${type};`);
    } catch (e) {
      // Column already exists, ignore
    }
  };

  await addColumnIfMissing('latitude', 'REAL');
  await addColumnIfMissing('longitude', 'REAL');
  await addColumnIfMissing('local_photo_uri', 'TEXT');

  console.log('✅ Database ready');
};
// Insert a new record with location and photo
export const insertRecord = async (db, record) => {
  const { id, name, phone_number, problem_statement, latitude, longitude, local_photo_uri } = record;
  const result = await db.runAsync(
    'INSERT INTO PendingRecords (id, name, phone_number, problem_statement, latitude, longitude, local_photo_uri, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, phone_number, problem_statement, latitude || null, longitude || null, local_photo_uri || null, 'PENDING']
  );
  return result;
};

// Get all pending records
export const getPendingRecords = async (db) => {
  const result = await db.getAllAsync(
    'SELECT * FROM PendingRecords WHERE sync_status = ? ORDER BY created_at DESC',
    ['PENDING']
  );
  return result;
};

// Update an existing record
export const updateRecord = async (db, id, updates) => {
  const { name, phone_number, problem_statement, latitude, longitude, local_photo_uri } = updates;
  await db.runAsync(
    'UPDATE PendingRecords SET name = ?, phone_number = ?, problem_statement = ?, latitude = ?, longitude = ?, local_photo_uri = ? WHERE id = ?',
    [name, phone_number, problem_statement, latitude || null, longitude || null, local_photo_uri || null, id]
  );
};

// Delete synced records
export const deleteSyncedRecords = async (db, ids) => {
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM PendingRecords WHERE id IN (${placeholders})`,
    ids
  );
};

// Get count of pending records
export const getPendingCount = async (db) => {
  const result = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM PendingRecords WHERE sync_status = ?',
    ['PENDING']
  );
  return result.count;
};