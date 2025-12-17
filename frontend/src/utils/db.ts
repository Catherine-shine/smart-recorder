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
      uploadHashId?: string; // 后端返回的hashid
    };
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'smart-recorder-db';
const DB_VERSION = 2; // 升级版本号

let dbPromise: Promise<IDBPDatabase<RecordingDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<RecordingDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // 如果是旧版本，可能需要处理数据迁移，或者直接创建store
        if (oldVersion < 1) {
          const store = db.createObjectStore('recordings', {
            keyPath: 'id',
          });
          store.createIndex('by-timestamp', 'timestamp');
        }
        // 版本2不需要修改store结构，因为IDB是NoSQL，直接写入新字段即可
        // 但为了规范，我们可以在这里做一些检查
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

export const updateRecordingUploadStatus = async (id: string, hashId: string) => {
  const db = await initDB();
  const recording = await db.get('recordings', id);
  if (recording) {
    recording.isUploaded = true;
    recording.uploadHashId = hashId;
    await db.put('recordings', recording);
  }
};


export const getRecordings = async () => {
  const db = await initDB();
  return db.getAllFromIndex('recordings', 'by-timestamp');
};

export const deleteRecording = async (id: string) => {
  const db = await initDB();
  await db.delete('recordings', id);
};
