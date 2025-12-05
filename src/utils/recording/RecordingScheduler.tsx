// src/utils/recording/RecordingScheduler.ts
import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  endRecording,
  resetRecordingState,
  collectData,
  selectRecordingStatus,
  selectCollectedData,
} from '../../store/slices/recordingSlice';
import { RECORDING_STATUS } from '../../types/common';

export function useRecordingScheduler() {
  const dispatch = useAppDispatch();
  const recordingStatus = useAppSelector(selectRecordingStatus);
  const collectedData = useAppSelector(selectCollectedData);
  
  // 存储 MediaRecorder 实例（避免依赖Redux，用ref存储）
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // 存储屏幕流（ref存储，避免Redux序列化问题）
  const streamRef = useRef<MediaStream | null>(null);
  // 存储视频分片数据
  const recordedBlobsRef = useRef<BlobPart[]>([]);

  // 通用录制启动逻辑
  const startRecordingSession = useCallback((stream: MediaStream, mimeType: string, filePrefix: string) => {
    streamRef.current = stream;

    // 创建MediaRecorder实例
    const recorder = new MediaRecorder(stream, {
      mimeType,
    });
    mediaRecorderRef.current = recorder;
    recordedBlobsRef.current = [];

    // 监听视频分片数据
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedBlobsRef.current.push(e.data);
      }
    };

    // 录制结束时：收集完整视频Blob到Redux
    recorder.onstop = () => {
      if (recordedBlobsRef.current.length === 0) return;
      const blob = new Blob(recordedBlobsRef.current, { type: mimeType });
      // 将视频Blob存入Redux
      dispatch(collectData({ type: 'video', data: blob }));

      // 自动下载（可选）
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filePrefix}_${new Date().toLocaleString().replace(/[/: ]/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };

    // 启动录制
    recorder.start(1000);
  }, [dispatch]);

  // 开始录屏
  const handleStartScreen = useCallback(async () => {
    try {
      // 1. 重置录制状态
      dispatch(resetRecordingState());
      // 2. 触发Redux开始录制Action
      dispatch(startRecording());
      // 3. 请求屏幕捕获授权
      const captureStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true, // 可选：录制系统音频
      } as MediaStreamConstraints);
      
      startRecordingSession(captureStream, 'video/webm; codecs=vp9', '录屏');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '录屏启动失败：用户拒绝授权或浏览器不支持';
      console.error('录屏错误：', errorMsg);
      dispatch(resetRecordingState()); // 失败时重置状态
    }
  }, [dispatch, startRecordingSession]);

  // 开始录音
  const handleStartAudio = useCallback(async () => {
    try {
      dispatch(resetRecordingState());
      dispatch(startRecording());
      
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startRecordingSession(audioStream, 'audio/webm', '录音');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '录音启动失败：用户拒绝授权或浏览器不支持';
      console.error('录音错误：', errorMsg);
      dispatch(resetRecordingState());
    }
  }, [dispatch, startRecordingSession]);

  // 开始摄像头录制
  const handleStartCamera = useCallback(async () => {
    try {
      dispatch(resetRecordingState());
      dispatch(startRecording());
      
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      startRecordingSession(cameraStream, 'video/webm; codecs=vp9', '摄像头录制');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '摄像头录制启动失败：用户拒绝授权或浏览器不支持';
      console.error('摄像头录制错误：', errorMsg);
      dispatch(resetRecordingState());
    }
  }, [dispatch, startRecordingSession]);

  // 暂停录屏
  const handlePause = useCallback(() => {
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    // 触发Redux暂停Action
    dispatch(pauseRecording());
    // 暂停MediaRecorder
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
  }, [dispatch, recordingStatus]);

  // 恢复录屏
  const handleResume = useCallback(() => {
    if (recordingStatus !== RECORDING_STATUS.PAUSED) return;
    // 触发Redux恢复Action
    dispatch(resumeRecording());
    // 恢复MediaRecorder
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
  }, [dispatch, recordingStatus]);

  // 结束录屏
  const handleEnd = useCallback(() => {
    // 触发Redux结束Action
    dispatch(endRecording());
    // 停止MediaRecorder并释放流
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [dispatch]);

  // 收集白板数据（供外部组件调用，如白板组件）
  const collectWhiteboardData = useCallback((whiteboardData: any) => {
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    dispatch(collectData({ type: 'whiteboard', data: whiteboardData }));
  }, [dispatch, recordingStatus]);

  // 收集鼠标数据（供外部组件调用）
  const collectMouseData = useCallback((mouseData: { x: number; y: number; timestamp: number }) => {
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    dispatch(collectData({ type: 'mouse', data: mouseData }));
  }, [dispatch, recordingStatus]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      dispatch(resetRecordingState());
    };
  }, [dispatch]);

  return {
    recordingStatus,
    collectedData,
    handleStart: handleStartScreen, // 保持兼容
    handleStartScreen,
    handleStartAudio,
    handleStartCamera,
    handlePause,
    handleResume,
    handleEnd,
    collectWhiteboardData, // 暴露给外部收集白板数据
    collectMouseData, // 暴露给外部收集鼠标数据
  };
}