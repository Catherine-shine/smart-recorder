// src/utils/recording/RecordingScheduler.ts
import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { saveRecording } from '../db';
import { v4 as uuidv4 } from 'uuid';
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  endRecording,
  resetRecordingState,
  selectRecordingStatus,
  selectCollectedData,
  collectData,
} from '../../store/slices/recordingSlice';
import { RECORDING_STATUS } from '../../types/common';
import { uploadRecording } from '../../api/recording';
import type { RecordingUploadForm } from '../../types/api/apiTypes';
import { setCameraEnabled, setMicrophoneEnabled } from '../../store/slices/mediastreamSlice';


// 媒体设备状态变化记录
interface MediaStateChange {
  timestamp: number; // 相对于录屏开始的时间戳（毫秒）
  isEnabled: boolean; // 设备是否开启
}

// 全局单例引用，确保只有一个MediaRecorder实例在运行
const globalMediaRecorderRef = {
  instance: null as MediaRecorder | null,
  audioInstance: null as MediaRecorder | null,
  webcamInstance: null as MediaRecorder | null,
  stream: null as MediaStream | null,
  audioStream: null as MediaStream | null,
  webcamStream: null as MediaStream | null,
  recordedBlobs: [] as BlobPart[],
  audioBlobs: [] as BlobPart[],
  webcamBlobs: [] as BlobPart[],
  isInitialized: false,
  startTime: 0,
  endTime: 0,
  // 标记摄像头和麦克风是否处于"关闭但保留空白数据"状态
  isCameraMuted: false,
  isMicMuted: false,
  // 音频MIME类型，确保空白音频与实际录制音频格式一致
  audioMimeType: 'audio/webm;codecs=opus' as string,
  // 摄像头视频MIME类型，确保空白视频与实际录制视频格式一致
  webcamMimeType: 'video/webm;codecs=vp8' as string,
  // 存储设备状态变化的时间戳
  audioStateChanges: [] as MediaStateChange[],
  cameraStateChanges: [] as MediaStateChange[],
  // 存储白板和鼠标数据
  whiteboardData: [] as any[],
  mouseData: [] as { x: number; y: number; timestamp: number }[]
};

// 将单例挂载到window对象上，供其他组件访问
window.globalMediaRecorderRef = globalMediaRecorderRef;



export function useRecordingScheduler() {
  const dispatch = useAppDispatch();
  const recordingStatus = useAppSelector(selectRecordingStatus);
  const collectedData = useAppSelector(selectCollectedData);
  
  // 使用 ref 追踪最新的 collectedData，解决闭包问题
  const collectedDataRef = useRef(collectedData);
  useEffect(() => {
    collectedDataRef.current = collectedData;
  }, [collectedData]);

  
  // 用于跟踪调用次数的ref
  const callCountRef = useRef({
    start: 0,
    pause: 0,
    resume: 0,
    end: 0
  });



  // 清理录制资源的函数
  const cleanupRecording = () => {
    console.log('cleanupRecording: 开始清理录制资源');
    console.log('cleanupRecording: 清理前的状态 - stream:', !!globalMediaRecorderRef.stream, 'isInitialized:', globalMediaRecorderRef.isInitialized);
    // 清除定时器（已移除空白数据生成逻辑）

    // 清理所有媒体流
    if (globalMediaRecorderRef.stream) {
      console.log('cleanupRecording: 停止屏幕共享流');
      console.log('cleanupRecording: 流的track数量:', globalMediaRecorderRef.stream.getTracks().length);
      globalMediaRecorderRef.stream.getTracks().forEach((track, index) => {
        console.log(`cleanupRecording: 停止track ${index} (kind: ${track.kind}, enabled: ${track.enabled})`);
        track.stop();
        console.log(`cleanupRecording: track ${index} 停止结果: enabled=${track.enabled}, readyState=${track.readyState}`);
      });
      globalMediaRecorderRef.stream = null;
      console.log('cleanupRecording: 屏幕共享流已停止并设置为null');
    } else {
      console.log('cleanupRecording: 屏幕共享流不存在，跳过停止');
    }
    
    if (globalMediaRecorderRef.audioStream) {
      globalMediaRecorderRef.audioStream.getTracks().forEach(track => track.stop());
      globalMediaRecorderRef.audioStream = null;
    }
    
    if (globalMediaRecorderRef.webcamStream) {
      globalMediaRecorderRef.webcamStream.getTracks().forEach(track => track.stop());
      globalMediaRecorderRef.webcamStream = null;
    }
    
    // 录制结束且数据处理完成后，重置单例状态
    console.log('cleanupRecording: 重置单例状态');
    globalMediaRecorderRef.instance = null;
    globalMediaRecorderRef.audioInstance = null;
    globalMediaRecorderRef.webcamInstance = null;
    globalMediaRecorderRef.recordedBlobs = [];
    globalMediaRecorderRef.audioBlobs = [];
    globalMediaRecorderRef.webcamBlobs = [];
    globalMediaRecorderRef.whiteboardData = [];
    globalMediaRecorderRef.mouseData = [];
    globalMediaRecorderRef.isInitialized = false;
    // 保持摄像头和麦克风的状态不变
    globalMediaRecorderRef.startTime = 0;
    globalMediaRecorderRef.endTime = 0;
  };

  // 开始录屏
  const handleStart = useCallback(async () => {
    callCountRef.current.start++; 
    console.log('handleStart调用次数:', callCountRef.current.start);
    console.log('开始录制前的状态:', recordingStatus);

    try {
      // 如果已经初始化，直接返回
      if (globalMediaRecorderRef.isInitialized) {
        console.log('录制器已初始化，跳过重复创建');
        return;
      }
      
      // 1. 重置录制状态
      dispatch(resetRecordingState());
      
      // 设置初始化标志，防止并发调用时Redux action被执行多次
      globalMediaRecorderRef.isInitialized = true;
      
      // 记录开始时间戳
      const startTime = Date.now();
      globalMediaRecorderRef.startTime = startTime;
      // 以下字段用于旧的分段上传逻辑，已不再需要
      // globalMediaRecorderRef.lastSegmentTime = startTime;
      // globalMediaRecorderRef.segmentIndex = 0;
      
      // 初始化设备状态变化记录 - 默认关闭摄像头和麦克风
      globalMediaRecorderRef.audioStateChanges = [{
        timestamp: 0, // 录制开始时的时间戳
        isEnabled: false // 默认关闭麦克风
      }];
      
      globalMediaRecorderRef.cameraStateChanges = [{
        timestamp: 0, // 录制开始时的时间戳
        isEnabled: false // 默认关闭摄像头
      }];
      
      // 2. 请求屏幕捕获授权
      const captureStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true, // 可选：录制系统音频
      } as MediaStreamConstraints);

      // 3. 默认关闭麦克风：直接生成空白音频数据，不请求麦克风权限
      console.log('默认关闭麦克风，开始生成空白音频数据');
      globalMediaRecorderRef.isMicMuted = true;
      dispatch(setMicrophoneEnabled(false));
      
      // 默认关闭摄像头：直接生成空白视频数据，不请求摄像头权限
      console.log('默认关闭摄像头，开始生成空白视频数据');
      globalMediaRecorderRef.isCameraMuted = true;
      dispatch(setCameraEnabled(false));
      
      // 初始化时不自动生成空白数据，只在设备状态变化时记录状态变化
      
      globalMediaRecorderRef.stream = captureStream;

      // 5. 创建屏幕录制MediaRecorder实例
      // 使用webm格式以兼容后端要求
      const videoTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
      let selectedMimeType = 'video/webm;codecs=vp8,opus';
      
      for (const type of videoTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      console.log('Selected video MIME type:', selectedMimeType);
      
      // 4. 默认关闭摄像头：直接生成空白视频数据，不请求摄像头权限
      console.log('默认关闭摄像头，开始生成空白视频数据');
      globalMediaRecorderRef.isCameraMuted = true;
      dispatch(setCameraEnabled(false));
      
      // 保存摄像头使用的MIME类型
      globalMediaRecorderRef.webcamMimeType = selectedMimeType;
      
      // 确保webcamBlobs数组已初始化
      if (!globalMediaRecorderRef.webcamBlobs) {
        globalMediaRecorderRef.webcamBlobs = [];
      }
      
      const recorder = new MediaRecorder(captureStream, {
        mimeType: selectedMimeType,
      });
      globalMediaRecorderRef.instance = recorder;
      globalMediaRecorderRef.recordedBlobs = [];
      
      // 7. 监听视频分片数据（仅收集数据，不实时上传）
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          globalMediaRecorderRef.recordedBlobs.push(e.data);
        }
      };
      
      // 音频分段数据处理（仅收集数据，不实时上传）
      if (globalMediaRecorderRef.audioInstance) {
        globalMediaRecorderRef.audioInstance.ondataavailable = (e) => {
          if (e.data.size > 0) {
            globalMediaRecorderRef.audioBlobs.push(e.data);
          }
        };
      }
      
      // 摄像头分段数据处理（仅收集数据，不实时上传）
      if (globalMediaRecorderRef.webcamInstance) {
        globalMediaRecorderRef.webcamInstance.ondataavailable = (e) => {
          if (e.data.size > 0) {
            globalMediaRecorderRef.webcamBlobs.push(e.data);
          }
        };
      }
      
      // 定期上传逻辑已移除，改为录制结束后统一上传
      
      // 设置分段上传定时器（每5秒上传一次）- 已移除
      // const segmentUploadInterval = setInterval(uploadSegment, 5000);
      
      // 8. 监听录制结束事件
      recorder.onstop = async () => {
        console.log('recorder.onstop: 录制结束事件被触发');
        console.log('recorder.onstop: recordedBlobs.length:', globalMediaRecorderRef.recordedBlobs.length);
        console.log('recorder.onstop: endTime - startTime:', globalMediaRecorderRef.endTime - globalMediaRecorderRef.startTime);
        
        // 清除分段上传定时器（已移除）
        // clearInterval(segmentUploadInterval);

        try {
          if (globalMediaRecorderRef.recordedBlobs.length === 0 && 
              globalMediaRecorderRef.audioBlobs.length === 0 && 
              globalMediaRecorderRef.webcamBlobs.length === 0) {
            console.error('No video data recorded!');
            return;
          }

          console.log('Recording stopped, blobs collected:', globalMediaRecorderRef.recordedBlobs.length);
          console.log('Webcam blobs collected:', globalMediaRecorderRef.webcamBlobs.length);
          console.log('Audio blobs collected:', globalMediaRecorderRef.audioBlobs.length);

          // 停止麦克风录制（如果已启动）
          if (globalMediaRecorderRef.audioInstance) {
            globalMediaRecorderRef.audioInstance.stop();

            // 等待麦克风录制数据可用
            await new Promise(resolve => {
              if (globalMediaRecorderRef.audioBlobs.length > 0) {
                resolve(null);
              } else {
                globalMediaRecorderRef.audioInstance!.onstop = () => resolve(null);
              }
            });
          }
          
          // 计算实际录制时长
          const actualDuration = globalMediaRecorderRef.endTime - globalMediaRecorderRef.startTime;
          console.log('Actual recording duration:', actualDuration, 'ms');
          
          // 停止摄像头录制（如果已启动）
          if (globalMediaRecorderRef.webcamInstance) {
            globalMediaRecorderRef.webcamInstance.stop();

            // 等待摄像头录制数据可用
            await new Promise(resolve => {
              // 确保总是等待MediaRecorder的stop事件完成，以获取所有录制数据
              globalMediaRecorderRef.webcamInstance!.onstop = () => resolve(null);
            });
          }

          // 自动下载（可选）
          // const videoBlob = new Blob(globalMediaRecorderRef.recordedBlobs, { type: recorder.mimeType });
          // const url = URL.createObjectURL(videoBlob);
          // const a = document.createElement('a');
          // a.style.display = 'none';
          // a.href = url;
          // a.download = `录屏_${new Date().toLocaleString().replace(/[/: ]/g, '_')}.${recorder.mimeType.includes('webm') ? 'webm' : 'mp4'}`;
          // document.body.appendChild(a);
          // a.click();
          // setTimeout(() => {
          //   document.body.removeChild(a);
          //   URL.revokeObjectURL(url);
          // }, 100);

          // 保存到 IndexedDB
          try {
            const recordingId = uuidv4();
            const timestamp = globalMediaRecorderRef.startTime;
            const currentCollectedData = collectedDataRef.current;

            console.log('Saving recording to IndexedDB:', recordingId);
            
            const videoBlob = new Blob(globalMediaRecorderRef.recordedBlobs, { type: recorder.mimeType });
            
            let audioBlob = undefined;
            if (globalMediaRecorderRef.audioBlobs.length > 0) {
              audioBlob = new Blob(globalMediaRecorderRef.audioBlobs, { type: globalMediaRecorderRef.audioMimeType || 'audio/webm' });
            }
            
            let webcamBlob = undefined;
            if (globalMediaRecorderRef.webcamBlobs.length > 0) {
              webcamBlob = new Blob(globalMediaRecorderRef.webcamBlobs, { type: globalMediaRecorderRef.webcamMimeType || recorder.mimeType });
            }

            await saveRecording({
              id: recordingId,
              timestamp: timestamp,
              duration: actualDuration,
              videoBlob: videoBlob,
              audioBlob: audioBlob,
              webcamBlob: webcamBlob,
              whiteboardData: globalMediaRecorderRef.whiteboardData,
              mouseData: globalMediaRecorderRef.mouseData,
              name: `录制_${new Date(timestamp).toLocaleString()}`
            });
            
            console.log('Recording saved to IndexedDB successfully');
            alert('录制已保存到本地');

          } catch (error) {
            console.error('保存录制失败：', error);
            alert('保存录制失败');
          }
          
        } catch (error) {
          console.error('录制结束处理失败：', error);
          // 打印更详细的错误信息
          if (error instanceof Error) {
            console.error('处理错误详情:', error.message);
            console.error('处理错误堆栈:', error.stack);
          }
        } finally {
          // 清理所有媒体流和定时器 - 确保无论发生什么错误都能执行
          console.log('recorder.onstop.finally: 调用cleanupRecording()');
          cleanupRecording();
        }
      };

      // 9. 开始录制
      recorder.start();
      
      // 9. 触发Redux开始录制Action - 确保在recorder.start()之后调用，避免状态更新过早
      dispatch(startRecording());
      globalMediaRecorderRef.startTime = Date.now();
      console.log('Redux状态更新为RECORDING，当前recordingStatus:', RECORDING_STATUS.RECORDING);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '录屏启动失败：用户拒绝授权或浏览器不支持';
      console.error('录屏错误：', errorMsg);
      dispatch(resetRecordingState()); // 失败时重置状态
      cleanupRecording();
    }
  }, [dispatch, recordingStatus]);

  // 暂停录屏
  const handlePause = useCallback(() => {
    callCountRef.current.pause++;
    console.log('handlePause调用次数:', callCountRef.current.pause);
    console.log('调用handlePause时的recordingStatus:', recordingStatus);
    
    // 触发Redux暂停Action - 无论当前状态如何，都尝试暂停
    dispatch(pauseRecording());
    
    // 暂停所有MediaRecorder实例 - 移除状态检查，直接尝试暂停
    try {
      if (globalMediaRecorderRef.instance) {
        globalMediaRecorderRef.instance.pause();
        console.log('暂停屏幕录制成功');
      }
    } catch (error) {
      console.error('暂停屏幕录制失败:', error);
    }
    
    try {
      if (globalMediaRecorderRef.audioInstance) {
        globalMediaRecorderRef.audioInstance.pause();
        console.log('暂停音频录制成功');
      }
    } catch (error) {
      console.error('暂停音频录制失败:', error);
    }
    
    try {
      if (globalMediaRecorderRef.webcamInstance) {
        globalMediaRecorderRef.webcamInstance.pause();
        console.log('暂停摄像头录制成功');
      }
    } catch (error) {
      console.error('暂停摄像头录制失败:', error);
    }
    
    // 不再使用定时器生成空白媒体数据，无需暂停
  }, [dispatch]);

  // 恢复录屏
  const handleResume = useCallback(() => {
    callCountRef.current.resume++;
    console.log('handleResume调用次数:', callCountRef.current.resume);
    
    // 触发Redux恢复Action - 无论当前状态如何，都尝试恢复
    dispatch(resumeRecording());
    
    // 恢复所有MediaRecorder实例 - 移除状态检查，直接尝试恢复
    try {
      if (globalMediaRecorderRef.instance) {
        globalMediaRecorderRef.instance.resume();
        console.log('恢复屏幕录制成功');
      }
    } catch (error) {
      console.error('恢复屏幕录制失败:', error);
    }
    
    try {
      if (globalMediaRecorderRef.audioInstance) {
        globalMediaRecorderRef.audioInstance.resume();
        console.log('恢复音频录制成功');
      }
    } catch (error) {
      console.error('恢复音频录制失败:', error);
    }
    
    try {
      if (globalMediaRecorderRef.webcamInstance) {
        globalMediaRecorderRef.webcamInstance.resume();
        console.log('恢复摄像头录制成功');
      }
    } catch (error) {
      console.error('恢复摄像头录制失败:', error);
    }
    
    // 不再使用定时器生成空白媒体数据，无需恢复
  }, [dispatch]);

  // 结束录屏
  const handleEnd = useCallback(() => {
    callCountRef.current.end++;
    console.log('handleEnd调用次数:', callCountRef.current.end);
    console.log('handleEnd: 停止录制前的状态 - instance:', !!globalMediaRecorderRef.instance, 'stream:', !!globalMediaRecorderRef.stream);
    
    // 不再使用定时器生成空白媒体数据，无需清理
    
    // 记录结束时间戳
    globalMediaRecorderRef.endTime = Date.now();
    
    // 触发Redux结束Action
    dispatch(endRecording());
    
    // 停止所有MediaRecorder实例
    // 直接调用stop方法，确保onstop事件总是会被触发
    if (globalMediaRecorderRef.instance) {
      console.log('handleEnd: 调用instance.stop()');
      globalMediaRecorderRef.instance.stop();
    } else {
      console.log('handleEnd: instance不存在');
    }
    
    if (globalMediaRecorderRef.audioInstance) {
      console.log('handleEnd: 调用audioInstance.stop()');
      globalMediaRecorderRef.audioInstance.stop();
    }
    
    if (globalMediaRecorderRef.webcamInstance) {
      console.log('handleEnd: 调用webcamInstance.stop()');
      globalMediaRecorderRef.webcamInstance.stop();
    }
    
    // 注意：这里不再直接调用cleanupRecording()
    // 清理操作会在MediaRecorder的onstop事件中完成，确保上传逻辑能获取到完整的录制数据
    // 已移除备份方案（直接停止屏幕共享流的代码），让MediaRecorder自然完成onstop事件
  }, [dispatch]);

  // 收集白板数据（供外部组件调用，如白板组件）
  const collectWhiteboardData = useCallback((whiteboardData: any) => {
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    console.log('RecordingScheduler: pushing whiteboard data', whiteboardData.id);
    globalMediaRecorderRef.whiteboardData.push(whiteboardData);
  }, [recordingStatus]);

  // 收集鼠标数据（供外部组件调用）
  const collectMouseData = useCallback((mouseData: { x: number; y: number; timestamp: number }) => {
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    globalMediaRecorderRef.mouseData.push(mouseData);
  }, [recordingStatus]);

  // 切换麦克风状态（静音/取消静音）
  const toggleMicrophone = useCallback(() => {
    if (!globalMediaRecorderRef.isInitialized) return;
    
    // 记录状态变化的时间戳（相对于录屏开始的时间）
    const relativeTimestamp = Date.now() - globalMediaRecorderRef.startTime;
    
    if (globalMediaRecorderRef.isMicMuted) {
      // 取消静音 - 尝试重新获取麦克风流
      try {
        const audioConstraints: MediaStreamConstraints = {
          audio: true
        };
        
        navigator.mediaDevices.getUserMedia(audioConstraints).then(stream => {
          // 保存状态变化记录
          globalMediaRecorderRef.audioStateChanges.push({
            timestamp: relativeTimestamp,
            isEnabled: true
          });
          
          // 停止之前的音频流
          if (globalMediaRecorderRef.audioStream) {
            globalMediaRecorderRef.audioStream.getTracks().forEach(track => track.stop());
          }
          
          // 保存新的音频流
          globalMediaRecorderRef.audioStream = stream;
          
          // 创建新的MediaRecorder实例
          const audioTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp3'];
          let audioSelectedMimeType = 'audio/webm';
          
          for (const type of audioTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              audioSelectedMimeType = type;
              break;
            }
          }
          
          // 保存选择的音频MIME类型，确保与空白音频格式一致
          globalMediaRecorderRef.audioMimeType = audioSelectedMimeType;
          
          globalMediaRecorderRef.audioInstance = new MediaRecorder(globalMediaRecorderRef.audioStream, {
            mimeType: audioSelectedMimeType,
          });
          
          globalMediaRecorderRef.audioInstance.ondataavailable = (e) => {
            if (e.data.size > 0) {
              globalMediaRecorderRef.audioBlobs.push(e.data);
            }
          };
          
          // 根据当前录制状态决定是否立即开始录制
          if (recordingStatus === RECORDING_STATUS.RECORDING) {
            globalMediaRecorderRef.audioInstance.start();
          } else if (recordingStatus === RECORDING_STATUS.PAUSED) {
            globalMediaRecorderRef.audioInstance.start();
            globalMediaRecorderRef.audioInstance.pause();
          }
          
          globalMediaRecorderRef.isMicMuted = false;
          dispatch(setMicrophoneEnabled(true));
          console.log('麦克风已取消静音');
        }).catch(error => {
        console.error('重新获取麦克风流失败:', error);
        });
      } catch (error) {
        console.error('切换麦克风状态失败:', error);
      }
    } else {
      // 静音 - 停止麦克风流
      if (globalMediaRecorderRef.audioInstance) {
        globalMediaRecorderRef.audioInstance.stop();
        globalMediaRecorderRef.audioInstance = null;
      }
      
      if (globalMediaRecorderRef.audioStream) {
        globalMediaRecorderRef.audioStream.getTracks().forEach(track => track.stop());
        globalMediaRecorderRef.audioStream = null;
      }
      
      // 保存状态变化记录
      globalMediaRecorderRef.audioStateChanges.push({
        timestamp: relativeTimestamp,
        isEnabled: false
      });
      
      globalMediaRecorderRef.isMicMuted = true;
      dispatch(setMicrophoneEnabled(false));
      console.log('麦克风已静音');
    }
  }, [recordingStatus]);

  // 切换摄像头状态（关闭/打开）
  const toggleCamera = useCallback(() => {
    if (!globalMediaRecorderRef.isInitialized) return;
    
    // 记录状态变化的时间戳（相对于录屏开始的时间）
    const relativeTimestamp = Date.now() - globalMediaRecorderRef.startTime;
    
    if (globalMediaRecorderRef.isCameraMuted) {
      // 打开摄像头 - 尝试重新获取摄像头流
      try {
        const cameraConstraints: MediaStreamConstraints = {
          video: true,
          audio: false
        };
        
        navigator.mediaDevices.getUserMedia(cameraConstraints).then(stream => {
          // 保存状态变化记录
          globalMediaRecorderRef.cameraStateChanges.push({
            timestamp: relativeTimestamp,
            isEnabled: true
          });
          
          // 停止之前的摄像头流
          if (globalMediaRecorderRef.webcamStream) {
            globalMediaRecorderRef.webcamStream.getTracks().forEach(track => track.stop());
          }
          
          // 保存新的摄像头流
          globalMediaRecorderRef.webcamStream = stream;
          
          // 确保webcamBlobs数组已初始化
          if (!globalMediaRecorderRef.webcamBlobs) {
            globalMediaRecorderRef.webcamBlobs = [];
          }
          
          // 创建新的MediaRecorder实例
          // 使用统一的MIME类型确保与空白视频兼容
          globalMediaRecorderRef.webcamInstance = new MediaRecorder(globalMediaRecorderRef.webcamStream, {
            mimeType: globalMediaRecorderRef.webcamMimeType,
          });
          
          globalMediaRecorderRef.webcamInstance.ondataavailable = (e) => {
            if (e.data.size > 0) {
              globalMediaRecorderRef.webcamBlobs.push(e.data);
            }
          };
          
          // 根据当前录制状态决定是否立即开始录制
          if (recordingStatus === RECORDING_STATUS.RECORDING) {
            globalMediaRecorderRef.webcamInstance.start();
          } else if (recordingStatus === RECORDING_STATUS.PAUSED) {
            globalMediaRecorderRef.webcamInstance.start();
            globalMediaRecorderRef.webcamInstance.pause();
          }
          
          globalMediaRecorderRef.isCameraMuted = false;
          dispatch(setCameraEnabled(true));
          console.log('摄像头已打开');
        }).catch(error => {
          console.error('重新获取摄像头流失败:', error);
        });
      } catch (error) {
        console.error('切换摄像头状态失败:', error);
      }
    } else {
      // 关闭摄像头 - 停止摄像头流
      if (globalMediaRecorderRef.webcamInstance) {
        globalMediaRecorderRef.webcamInstance.stop();
        globalMediaRecorderRef.webcamInstance = null;
      }
      
      if (globalMediaRecorderRef.webcamStream) {
        globalMediaRecorderRef.webcamStream.getTracks().forEach(track => track.stop());
        globalMediaRecorderRef.webcamStream = null;
      }
      
      // 保存状态变化记录
      globalMediaRecorderRef.cameraStateChanges.push({
        timestamp: relativeTimestamp,
        isEnabled: false
      });
      
      globalMediaRecorderRef.isCameraMuted = true;
      dispatch(setCameraEnabled(false));
      console.log('摄像头已关闭');
    }
  }, [recordingStatus]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 只有在录制状态下才自动结束，暂停状态下不自动结束
      if (recordingStatus === RECORDING_STATUS.RECORDING) {
        handleEnd();
      }
    };
  }, [recordingStatus, handleEnd]);

  return {
    recordingStatus,
    handleStart: handleStart, // 保持兼容
    handleStartScreen: handleStart,
    handlePause,
    handleResume,
    handleEnd,
    collectWhiteboardData, // 暴露给外部收集白板数据
    collectMouseData, // 暴露给外部收集鼠标数据
    toggleMicrophone, // 暴露麦克风切换方法
    toggleCamera // 暴露摄像头切换方法
  };
}