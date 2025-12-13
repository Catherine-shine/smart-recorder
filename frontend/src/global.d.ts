// src/types/global.d.ts
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
      startTime: number;
      endTime: number;
      isCameraMuted: boolean;
      isMicMuted: boolean;
      audioMimeType: string;
      webcamMimeType: string;
      audioStateChanges: { timestamp: number; isEnabled: boolean }[];
      cameraStateChanges: { timestamp: number; isEnabled: boolean }[];
      whiteboardData: any[];
      mouseData: { x: number; y: number; timestamp: number }[];
    };
  }
}

export {};