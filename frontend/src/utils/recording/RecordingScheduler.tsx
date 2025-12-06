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

// 全局单例引用，确保只有一个MediaRecorder实例在运行
const globalMediaRecorderRef = {
  instance: null as MediaRecorder | null,
  stream: null as MediaStream | null,
  recordedBlobs: [] as BlobPart[],
  isInitialized: false
};

export function useRecordingScheduler() {
  const dispatch = useAppDispatch();
  const recordingStatus = useAppSelector(selectRecordingStatus);
  const collectedData = useAppSelector(selectCollectedData);
  
  // 用于跟踪调用次数的ref
  const callCountRef = useRef({
    start: 0,
    pause: 0,
    resume: 0,
    end: 0
  });

  // 通用录制启动逻辑
  const startRecordingSession = useCallback((stream: MediaStream, mimeType: string, filePrefix: string) => {
globalMediaRecorderRef.stream = stream;

    // 创建MediaRecorder实例
    const recorder = new MediaRecorder(stream, {
      mimeType,
    });
    globalMediaRecorderRef.instance = recorder;
globalMediaRecorderRef.recordedBlobs = [];

    // 监听视频分片数据
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        globalMediaRecorderRef.recordedBlobs.push(e.data);
      }
    };

    // 录制结束时：收集完整视频Blob到Redux
    recorder.onstop = () => {
      if (globalMediaRecorderRef.recordedBlobs.length === 0) return;
      const blob = new Blob(globalMediaRecorderRef.recordedBlobs, { type: mimeType });
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

  const handleStart = useCallback(async () => {
    callCountRef.current.start++;
    console.log('handleStart调用次数:', callCountRef.current.start);

    try {
      // 如果已经初始化，直接返回
      if (globalMediaRecorderRef.isInitialized) {
        console.log('录制器已初始化，跳过重复创建');
        return;
      }
      
      // 立即设置初始化标志，防止并发调用时Redux action被执行多次
      globalMediaRecorderRef.isInitialized = true;
      
      // 1. 重置录制状态
      dispatch(resetRecordingState());
      // 2. 请求屏幕捕获授权
      const captureStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true, // 可选：录制系统音频
      } as MediaStreamConstraints);

      globalMediaRecorderRef.stream = captureStream;

      // 3. 创建MediaRecorder实例 - 自动选择浏览器支持的最佳视频格式
      // 检查浏览器支持的视频格式
      const videoTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
      let selectedMimeType = 'video/webm'; // 默认值
      
      // 选择第一个支持的格式
      for (const type of videoTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      console.log('Selected video MIME type:', selectedMimeType);
      
      const recorder = new MediaRecorder(captureStream, {
        mimeType: selectedMimeType,
      });
      globalMediaRecorderRef.instance = recorder;
      globalMediaRecorderRef.recordedBlobs = [];
      
      // 4. 触发Redux开始录制Action - 只有在成功创建MediaRecorder实例后才设置开始时间
      dispatch(startRecording());

      // 5. 监听视频分片数据
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          globalMediaRecorderRef.recordedBlobs.push(e.data);
        }
      };

      // 6. 录制结束时：收集完整视频Blob到Redux
      recorder.onstop = () => {
        if (globalMediaRecorderRef.recordedBlobs.length === 0) {
          console.error('No video data recorded!');
          // 录制失败时重置状态
          globalMediaRecorderRef.instance = null;
          globalMediaRecorderRef.recordedBlobs = [];
          globalMediaRecorderRef.isInitialized = false;
          return;
        }
        
        console.log('Recording stopped, blobs collected:', globalMediaRecorderRef.recordedBlobs.length);
        console.log('Each blob size:', globalMediaRecorderRef.recordedBlobs.map(blob => (blob instanceof Blob ? blob.size : (blob as any).length || 0)));
        
        // 使用与录制时相同的MIME类型创建Blob
        const videoBlob = new Blob(globalMediaRecorderRef.recordedBlobs, { type: recorder.mimeType });
        console.log('Created video blob:', videoBlob);
        console.log('Blob size:', videoBlob.size);
        console.log('Blob type:', videoBlob.type);
        
        // 将视频Blob存入Redux
        dispatch(collectData({ type: 'video', data: videoBlob }));

        // 自动下载（可选）
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `录屏_${new Date().toLocaleString().replace(/[/: ]/g, '_')}.${recorder.mimeType.includes('webm') ? 'webm' : 'mp4'}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        // 录制结束且数据处理完成后，重置单例状态
        globalMediaRecorderRef.instance = null;
        globalMediaRecorderRef.recordedBlobs = [];
        globalMediaRecorderRef.isInitialized = false;
      };

      // 开始录制，每秒生成一个视频分片，有助于生成更稳定的视频文件
      recorder.start(1000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '录屏启动失败：用户拒绝授权或浏览器不支持';
      console.error('录屏错误：', errorMsg);
      dispatch(resetRecordingState()); // 失败时重置状态
      globalMediaRecorderRef.isInitialized = false;
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
    callCountRef.current.pause++;
    console.log('handlePause调用次数:', callCountRef.current.pause);
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    // 触发Redux暂停Action
    dispatch(pauseRecording());
    // 暂停MediaRecorder
    if (globalMediaRecorderRef.instance?.state === 'recording') {
      globalMediaRecorderRef.instance.pause();
    }
  }, [dispatch, recordingStatus]);

  // 恢复录屏
  const handleResume = useCallback(() => {
    callCountRef.current.resume++;
    console.log('handleResume调用次数:', callCountRef.current.resume);
    if (recordingStatus !== RECORDING_STATUS.PAUSED) return;
    // 触发Redux恢复Action
    dispatch(resumeRecording());
    // 恢复MediaRecorder
    if (globalMediaRecorderRef.instance?.state === 'paused') {
      globalMediaRecorderRef.instance.resume();
    }
  }, [dispatch, recordingStatus]);

  // 结束录屏
  const handleEnd = useCallback(() => {
    callCountRef.current.end++;
    console.log('handleEnd调用次数:', callCountRef.current.end);
    // 触发Redux结束Action
    dispatch(endRecording());
    // 停止MediaRecorder并释放流
    if (globalMediaRecorderRef.instance?.state !== 'inactive') {
      globalMediaRecorderRef.instance?.stop();
    }
    if (globalMediaRecorderRef.stream) {
      globalMediaRecorderRef.stream.getTracks().forEach(track => track.stop());
      globalMediaRecorderRef.stream = null;
    }
    // 注意：不要立即清空recordedBlobs，因为stop()是异步的，需要等待onstop事件处理完成
    // 单例状态的重置将在onstop事件处理程序中完成
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
      // 只有当所有组件实例都卸载时，才清理资源
      // 这里我们通过dispatch resetRecordingState来清理Redux状态
      // 但不清理全局MediaRecorder实例，因为可能还有其他组件在使用
    };
  }, [dispatch]);

  return {
    recordingStatus,
    collectedData,
    handleStart: handleStart, // 保持兼容
    handleStartScreen: handleStart,
    handleStartAudio,
    handleStartCamera,
    handlePause,
    handleResume,
    handleEnd,
    collectWhiteboardData, // 暴露给外部收集白板数据
    collectMouseData, // 暴露给外部收集鼠标数据
  };
}