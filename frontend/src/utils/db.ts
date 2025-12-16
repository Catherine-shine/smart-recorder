import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface RecordingDB extends DBSchema {
  recordings: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      duration: number;
      videoBlob?: Blob;
      audioBlob?: Blob;
      webcamBlob?: Blob;
      whiteboardData: any[];
      mouseData: any[];
      audioStateChanges?: any[];
      cameraStateChanges?: any[];
      name: string;
      isUploaded: boolean;
    };
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'smart-recorder-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RecordingDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<RecordingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('recordings', {
          keyPath: 'id',
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
};

export const saveRecording = async (recording: {
  id: string;
  timestamp: number;
  duration: number;
  videoBlob?: Blob;
  audioBlob?: Blob;
  webcamBlob?: Blob;
  whiteboardData: any[];
  mouseData: any[];
  audioStateChanges?: any[];
  cameraStateChanges?: any[];
  name: string;
}) => {
  const db = await initDB();
  await db.put('recordings', {
    ...recording,
    isUploaded: false,
  });
};

export const getRecordings = async () => {
  const db = await initDB();
  return db.getAllFromIndex('recordings', 'by-timestamp');
};

export const deleteRecording = async (id: string) => {
  const db = await initDB();
  await db.delete('recordings', id);
};
