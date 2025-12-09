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
import { uploadRecording } from '../../api/recording';
import { setCameraEnabled, setMicrophoneEnabled } from '../../store/slices/mediastreamSlice';

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
  // 用于存储静音期间的空白数据
  blankAudioInterval: null as number | null,
  blankVideoInterval: null as number | null
};

// 将单例挂载到window对象上，供其他组件访问
window.globalMediaRecorderRef = globalMediaRecorderRef;

// 生成空白音频数据
const generateBlankAudio = (duration: number = 1000): Blob => {
  // 创建一个简单的空白WebM音频文件
  // 这里使用一个非常小的空白音频帧
  const audioData = new ArrayBuffer(44); // 最小的WebM头部大小
  return new Blob([audioData], { type: 'audio/webm' });
};

// 生成空白视频数据
const generateBlankVideo = (duration: number = 1000, width: number = 640, height: number = 480): Blob => {
  // 创建一个简单的空白WebM视频文件
  // 这里使用一个非常小的空白视频帧
  const videoData = new ArrayBuffer(100); // 最小的WebM头部大小
  return new Blob([videoData], { type: 'video/webm' });
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
    recorder.onstop = async () => {
      if (globalMediaRecorderRef.recordedBlobs.length === 0) {
        console.error('No video data recorded!');
        // 录制失败时重置状态
        cleanupRecording();
        return;
      }
      
      console.log('Recording stopped, blobs collected:', globalMediaRecorderRef.recordedBlobs.length);
      
      // 使用与录制时相同的MIME类型创建Blob
      const videoBlob = new Blob(globalMediaRecorderRef.recordedBlobs, { type: recorder.mimeType });
      console.log('Created video blob:', videoBlob);
      
      // 停止麦克风录制（如果已启动）
      let audioRecording = null;
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
        
        // 使用与麦克风录制时相同的MIME类型创建Blob
        if (globalMediaRecorderRef.audioBlobs.length > 0) {
          audioRecording = new Blob(globalMediaRecorderRef.audioBlobs, { type: globalMediaRecorderRef.audioInstance!.mimeType });
          console.log('Created audio blob:', audioRecording);
        }
      }
      
      // 停止摄像头录制（如果已启动）
      let webcamRecording = null;
      if (globalMediaRecorderRef.webcamInstance) {
        globalMediaRecorderRef.webcamInstance.stop();
        
        // 等待摄像头录制数据可用
        await new Promise(resolve => {
          if (globalMediaRecorderRef.webcamBlobs.length > 0) {
            resolve(null);
          } else {
            globalMediaRecorderRef.webcamInstance!.onstop = () => resolve(null);
          }
        });
        
        // 使用与摄像头录制时相同的MIME类型创建Blob
        if (globalMediaRecorderRef.webcamBlobs.length > 0) {
          webcamRecording = new Blob(globalMediaRecorderRef.webcamBlobs, { type: globalMediaRecorderRef.webcamInstance!.mimeType });
          console.log('Created webcam blob:', webcamRecording);
        }
      }
      
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
      
      // 上传录屏数据至后端
      try {
        // 构建上传表单数据
        const formData = {
          // 使用采集到的音频数据（如果有），否则创建空的音频文件
          audio: audioRecording || new Blob([''], { type: 'audio/webm' }),
          // 创建轨迹文件
          trajectory: new Blob([JSON.stringify({
            whiteboardData: collectedData.whiteboardData,
            mouseData: collectedData.mouseData
          })], { type: 'application/json' }),
          // 设置录屏文件
          screen_recording: videoBlob,
          // 设置摄像头录制文件（如果有）
          webcam_recording: webcamRecording
        };
        
        console.log('开始上传录屏数据...');
        const formDataForUpload = new FormData();
        formDataForUpload.append('audio', formData.audio, 'audio.webm');
        formDataForUpload.append('trajectory', formData.trajectory, 'trajectory.json');
        formDataForUpload.append('screen_recording', formData.screen_recording, 'screen_recording.webm');
        
        // 如果有摄像头录制文件，添加到表单
        if (formData.webcam_recording) {
          formDataForUpload.append('webcam_recording', formData.webcam_recording, 'webcam_recording.webm');
        }

        const response = await uploadRecording({
          audio: new File([formData.audio], 'audio.webm', { type: formData.audio.type }),
          trajectory: new File([formData.trajectory], 'trajectory.json', { type: formData.trajectory.type }),
          screen_recording: new File([formData.screen_recording], 'screen_recording.webm', { type: formData.screen_recording.type }),
          webcam_recording: formData.webcam_recording ? new File([formData.webcam_recording], 'webcam_recording.webm', { type: formData.webcam_recording.type }) : undefined
        });
        console.log('录屏数据上传成功！', response);
      } catch (error) {
        console.error('录屏数据上传失败：', error);
      }
      
      // 清理所有媒体流和定时器
      cleanupRecording();
    };

    // 启动录制
    recorder.start(1000);
  }, [dispatch, collectedData]);

  // 清理录制资源的函数
  const cleanupRecording = () => {
    // 清除定时器
    if (globalMediaRecorderRef.blankAudioInterval) {
      clearInterval(globalMediaRecorderRef.blankAudioInterval);
      globalMediaRecorderRef.blankAudioInterval = null;
    }
    if (globalMediaRecorderRef.blankVideoInterval) {
      clearInterval(globalMediaRecorderRef.blankVideoInterval);
      globalMediaRecorderRef.blankVideoInterval = null;
    }

    // 清理所有媒体流
    if (globalMediaRecorderRef.stream) {
      globalMediaRecorderRef.stream.getTracks().forEach(track => track.stop());
      globalMediaRecorderRef.stream = null;
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
    globalMediaRecorderRef.instance = null;
    globalMediaRecorderRef.audioInstance = null;
    globalMediaRecorderRef.webcamInstance = null;
    globalMediaRecorderRef.recordedBlobs = [];
    globalMediaRecorderRef.audioBlobs = [];
    globalMediaRecorderRef.webcamBlobs = [];
    globalMediaRecorderRef.isInitialized = false;
    // 保持摄像头和麦克风的状态不变
    globalMediaRecorderRef.startTime = 0;
    globalMediaRecorderRef.endTime = 0;
  };

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
      
      // 记录开始时间戳
      const startTime = Date.now();
      globalMediaRecorderRef.startTime = startTime;
      
      // 2. 请求屏幕捕获授权
      const captureStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true, // 可选：录制系统音频
      } as MediaStreamConstraints);

      // 3. 默认关闭麦克风：直接生成空白音频数据，不请求麦克风权限
      console.log('默认关闭麦克风，开始生成空白音频数据');
      globalMediaRecorderRef.isMicMuted = true;
      dispatch(setMicrophoneEnabled(false));
      // 开始生成空白音频数据
      globalMediaRecorderRef.blankAudioInterval = window.setInterval(() => {
        globalMediaRecorderRef.audioBlobs.push(generateBlankAudio());
      }, 1000);
      
      // 4. 默认关闭摄像头：直接生成空白视频数据，不请求摄像头权限
      console.log('默认关闭摄像头，开始生成空白视频数据');
      globalMediaRecorderRef.isCameraMuted = true;
      dispatch(setCameraEnabled(false));
      // 开始生成空白视频数据
      globalMediaRecorderRef.blankVideoInterval = window.setInterval(() => {
        globalMediaRecorderRef.webcamBlobs.push(generateBlankVideo());
      }, 1000);

      globalMediaRecorderRef.stream = captureStream;

      // 5. 创建屏幕录制MediaRecorder实例
      const videoTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
      let selectedMimeType = 'video/webm';
      
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
      
      // 6. 触发Redux开始录制Action
      dispatch(startRecording());

      // 7. 监听视频分片数据
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          globalMediaRecorderRef.recordedBlobs.push(e.data);
        }
      };

      // 8. 开始录制
      recorder.start(1000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '录屏启动失败：用户拒绝授权或浏览器不支持';
      console.error('录屏错误：', errorMsg);
      dispatch(resetRecordingState()); // 失败时重置状态
      cleanupRecording();
    }
  }, [dispatch]);

  // 暂停录屏
  const handlePause = useCallback(() => {
    callCountRef.current.pause++;
    console.log('handlePause调用次数:', callCountRef.current.pause);
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    
    // 触发Redux暂停Action
    dispatch(pauseRecording());
    
    // 暂停所有MediaRecorder实例
    if (globalMediaRecorderRef.instance?.state === 'recording') {
      globalMediaRecorderRef.instance.pause();
    }
    
    if (globalMediaRecorderRef.audioInstance?.state === 'recording') {
      globalMediaRecorderRef.audioInstance.pause();
    }
    
    if (globalMediaRecorderRef.webcamInstance?.state === 'recording') {
      globalMediaRecorderRef.webcamInstance.pause();
    }
    
    // 暂停空白数据生成
    if (globalMediaRecorderRef.blankAudioInterval) {
      clearInterval(globalMediaRecorderRef.blankAudioInterval);
      globalMediaRecorderRef.blankAudioInterval = null;
    }
    if (globalMediaRecorderRef.blankVideoInterval) {
      clearInterval(globalMediaRecorderRef.blankVideoInterval);
      globalMediaRecorderRef.blankVideoInterval = null;
    }
  }, [dispatch, recordingStatus]);

  // 恢复录屏
  const handleResume = useCallback(() => {
    callCountRef.current.resume++;
    console.log('handleResume调用次数:', callCountRef.current.resume);
    if (recordingStatus !== RECORDING_STATUS.PAUSED) return;
    
    // 触发Redux恢复Action
    dispatch(resumeRecording());
    
    // 恢复所有MediaRecorder实例
    if (globalMediaRecorderRef.instance?.state === 'paused') {
      globalMediaRecorderRef.instance.resume();
    }
    
    if (globalMediaRecorderRef.audioInstance?.state === 'paused') {
      globalMediaRecorderRef.audioInstance.resume();
    }
    
    if (globalMediaRecorderRef.webcamInstance?.state === 'paused') {
      globalMediaRecorderRef.webcamInstance.resume();
    }
    
    // 恢复空白数据生成
    if (globalMediaRecorderRef.isMicMuted && !globalMediaRecorderRef.blankAudioInterval) {
      globalMediaRecorderRef.blankAudioInterval = window.setInterval(() => {
        globalMediaRecorderRef.audioBlobs.push(generateBlankAudio());
      }, 1000);
    }
    if (globalMediaRecorderRef.isCameraMuted && !globalMediaRecorderRef.blankVideoInterval) {
      globalMediaRecorderRef.blankVideoInterval = window.setInterval(() => {
        globalMediaRecorderRef.webcamBlobs.push(generateBlankVideo());
      }, 1000);
    }
  }, [dispatch, recordingStatus]);

  // 结束录屏
  const handleEnd = useCallback(() => {
    callCountRef.current.end++;
    console.log('handleEnd调用次数:', callCountRef.current.end);
    
    // 记录结束时间戳
    globalMediaRecorderRef.endTime = Date.now();
    
    // 触发Redux结束Action
    dispatch(endRecording());
    
    // 停止所有MediaRecorder实例
    if (globalMediaRecorderRef.instance?.state !== 'inactive') {
      globalMediaRecorderRef.instance?.stop();
    }
    
    if (globalMediaRecorderRef.audioInstance?.state !== 'inactive') {
      globalMediaRecorderRef.audioInstance?.stop();
    }
    
    if (globalMediaRecorderRef.webcamInstance?.state !== 'inactive') {
      globalMediaRecorderRef.webcamInstance?.stop();
    }
    
    // 清理所有录制资源并重置状态
    cleanupRecording();
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

  // 切换麦克风状态（静音/取消静音）
  const toggleMicrophone = useCallback(() => {
    if (!globalMediaRecorderRef.isInitialized) return;
    
    if (globalMediaRecorderRef.isMicMuted) {
      // 取消静音 - 尝试重新获取麦克风流
      try {
        const audioConstraints: MediaStreamConstraints = {
          audio: true
        };
        
        navigator.mediaDevices.getUserMedia(audioConstraints).then(stream => {
          // 停止之前的空白数据生成
          if (globalMediaRecorderRef.blankAudioInterval) {
            clearInterval(globalMediaRecorderRef.blankAudioInterval);
            globalMediaRecorderRef.blankAudioInterval = null;
          }
          
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
            globalMediaRecorderRef.audioInstance.start(1000);
          } else if (recordingStatus === RECORDING_STATUS.PAUSED) {
            globalMediaRecorderRef.audioInstance.start(1000);
            globalMediaRecorderRef.audioInstance.pause();
          }
          
          globalMediaRecorderRef.isMicMuted = false;
          dispatch(setMicrophoneEnabled(true));
          console.log('麦克风已取消静音');
        }).catch(error => {
          console.error('重新获取麦克风流失败:', error);
          // 继续使用空白音频数据
          if (!globalMediaRecorderRef.blankAudioInterval && recordingStatus === RECORDING_STATUS.RECORDING) {
            globalMediaRecorderRef.blankAudioInterval = window.setInterval(() => {
              globalMediaRecorderRef.audioBlobs.push(generateBlankAudio());
            }, 1000);
          }
        });
      } catch (error) {
        console.error('切换麦克风状态失败:', error);
      }
    } else {
      // 静音 - 停止麦克风流并开始生成空白数据
      if (globalMediaRecorderRef.audioInstance) {
        globalMediaRecorderRef.audioInstance.stop();
        globalMediaRecorderRef.audioInstance = null;
      }
      
      if (globalMediaRecorderRef.audioStream) {
        globalMediaRecorderRef.audioStream.getTracks().forEach(track => track.stop());
        globalMediaRecorderRef.audioStream = null;
      }
      
      // 开始生成空白音频数据
      if (recordingStatus === RECORDING_STATUS.RECORDING) {
        globalMediaRecorderRef.blankAudioInterval = window.setInterval(() => {
          globalMediaRecorderRef.audioBlobs.push(generateBlankAudio());
        }, 1000);
      }
      
      globalMediaRecorderRef.isMicMuted = true;
      dispatch(setMicrophoneEnabled(false));
      console.log('麦克风已静音');
    }
  }, [recordingStatus]);

  // 切换摄像头状态（关闭/打开）
  const toggleCamera = useCallback(() => {
    if (!globalMediaRecorderRef.isInitialized) return;
    
    if (globalMediaRecorderRef.isCameraMuted) {
      // 打开摄像头 - 尝试重新获取摄像头流
      try {
        const cameraConstraints: MediaStreamConstraints = {
          video: true,
          audio: false
        };
        
        navigator.mediaDevices.getUserMedia(cameraConstraints).then(stream => {
          // 停止之前的空白数据生成
          if (globalMediaRecorderRef.blankVideoInterval) {
            clearInterval(globalMediaRecorderRef.blankVideoInterval);
            globalMediaRecorderRef.blankVideoInterval = null;
          }
          
          // 停止之前的摄像头流
          if (globalMediaRecorderRef.webcamStream) {
            globalMediaRecorderRef.webcamStream.getTracks().forEach(track => track.stop());
          }
          
          // 保存新的摄像头流
          globalMediaRecorderRef.webcamStream = stream;
          
          // 创建新的MediaRecorder实例
          const videoTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
          let webcamSelectedMimeType = 'video/webm;codecs=vp8';
          
          for (const type of videoTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              webcamSelectedMimeType = type;
              break;
            }
          }
          
          globalMediaRecorderRef.webcamInstance = new MediaRecorder(globalMediaRecorderRef.webcamStream, {
            mimeType: webcamSelectedMimeType,
          });
          
          globalMediaRecorderRef.webcamInstance.ondataavailable = (e) => {
            if (e.data.size > 0) {
              globalMediaRecorderRef.webcamBlobs.push(e.data);
            }
          };
          
          // 根据当前录制状态决定是否立即开始录制
          if (recordingStatus === RECORDING_STATUS.RECORDING) {
            globalMediaRecorderRef.webcamInstance.start(1000);
          } else if (recordingStatus === RECORDING_STATUS.PAUSED) {
            globalMediaRecorderRef.webcamInstance.start(1000);
            globalMediaRecorderRef.webcamInstance.pause();
          }
          
          globalMediaRecorderRef.isCameraMuted = false;
          dispatch(setCameraEnabled(true));
          console.log('摄像头已打开');
        }).catch(error => {
          console.error('重新获取摄像头流失败:', error);
          // 继续使用空白视频数据
          if (!globalMediaRecorderRef.blankVideoInterval && recordingStatus === RECORDING_STATUS.RECORDING) {
            globalMediaRecorderRef.blankVideoInterval = window.setInterval(() => {
              globalMediaRecorderRef.webcamBlobs.push(generateBlankVideo());
            }, 1000);
          }
        });
      } catch (error) {
        console.error('切换摄像头状态失败:', error);
      }
    } else {
      // 关闭摄像头 - 停止摄像头流并开始生成空白数据
      if (globalMediaRecorderRef.webcamInstance) {
        globalMediaRecorderRef.webcamInstance.stop();
        globalMediaRecorderRef.webcamInstance = null;
      }
      
      if (globalMediaRecorderRef.webcamStream) {
        globalMediaRecorderRef.webcamStream.getTracks().forEach(track => track.stop());
        globalMediaRecorderRef.webcamStream = null;
      }
      
      // 开始生成空白视频数据
      if (recordingStatus === RECORDING_STATUS.RECORDING) {
        globalMediaRecorderRef.blankVideoInterval = window.setInterval(() => {
          globalMediaRecorderRef.webcamBlobs.push(generateBlankVideo());
        }, 1000);
      }
      
      globalMediaRecorderRef.isCameraMuted = true;
[{
	"resource": "/c:/Users/LHN/Desktop/demo/smart-recorder/frontend/src/components/Recording/ControlPanel/ControlPanel.tsx",
	"owner": "typescript",
	"code": "2552",
	"severity": 8,
	"message": "找不到名称“setIsCameraOn”。你是否指的是“isCameraOn”?",
	"source": "ts",
	"startLineNumber": 43,
	"startColumn": 9,
	"endLineNumber": 43,
	"endColumn": 22,
	"relatedInformation": [
		{
			"startLineNumber": 23,
			"startColumn": 9,
			"endLineNumber": 23,
			"endColumn": 19,
			"message": "在此处声明了 \"isCameraOn\"。",
			"resource": "/c:/Users/LHN/Desktop/demo/smart-recorder/frontend/src/components/Recording/ControlPanel/ControlPanel.tsx"
		}
	],
	"origin": "extHost1",
	"extensionID": "vscode.typescript-language-features"
}]
      dispatch(setCameraEnabled(false));
      console.log('摄像头已关闭');
    }
  }, [recordingStatus]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 如果录制正在进行，自动结束
      if (recordingStatus !== RECORDING_STATUS.NOT_RECORDING) {
        handleEnd();
      }
    };
  }, [recordingStatus, handleEnd]);

  return {
    recordingStatus,
    collectedData,
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