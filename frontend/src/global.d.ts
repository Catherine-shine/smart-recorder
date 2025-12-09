// 为全局变量添加类型定义
declare global {
  interface Window {
    globalMediaRecorderRef: {
      instance: MediaRecorder | null;
      audioInstance: MediaRecorder | null;
      webcamInstance: MediaRecorder | null;
      stream: MediaStream | null;
      audioStream: MediaStream | null;
      webcamStream: MediaStream | null;
      recordedBlobs: BlobPart[];
      audioBlobs: BlobPart[];
      webcamBlobs: BlobPart[];
      isInitialized: boolean;
    };
  }
}

// 确保这个文件被视为模块
export {};