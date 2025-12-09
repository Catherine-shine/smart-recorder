import React, { useState, useEffect } from 'react';
import { Button, Space, type ButtonProps, Tooltip } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined, CameraOutlined, AudioOutlined, AudioMutedOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useRecordingScheduler } from '../../../utils/recording/RecordingScheduler';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { selectLastRecordingDuration } from '../../../store/slices/recordingSlice';
import { RECORDING_STATUS } from '../../../types/common';
import { setCameraEnabled, setMicrophoneEnabled, setCameraPreviewVisible } from '../../../store/slices/mediastreamSlice';
import CameraPreview from './cameraPreview';

const ControlPanel: React.FC = () => {
  const {
    recordingStatus,
    handleStart,
    handlePause,
    handleResume,
    handleEnd,
  } = useRecordingScheduler();
  
  const dispatch = useAppDispatch();
  
  // 获取摄像头和麦克风状态
  const isCameraOn = useAppSelector(state => state.mediastream.isCameraEnabled);
  const isMicOn = useAppSelector(state => state.mediastream.isMicrophoneEnabled);
  const [isLoading, setIsLoading] = useState(false);
  
  // 获取最后一次录制时长
  const lastRecordingDuration = useAppSelector(selectLastRecordingDuration);
  
  // 切换摄像头状态
  const toggleCamera = async () => {
    setIsLoading(true);
    
    try {
      if (isCameraOn) {
        // 关闭摄像头
        // 获取全局摄像头流并停止
        if (window.globalMediaRecorderRef?.webcamStream) {
          const videoTracks = window.globalMediaRecorderRef.webcamStream.getTracks().filter(track => track.kind === 'video');
          videoTracks.forEach(track => track.stop());
          window.globalMediaRecorderRef.webcamStream = null;
        }
        dispatch(setCameraEnabled(false));
      } else {
        // 开启摄像头
        const constraints: MediaStreamConstraints = {
          video: true,
          audio: false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.globalMediaRecorderRef.webcamStream = stream;
        
        // 如果正在录制，创建新的摄像头录制实例
        if (recordingStatus === RECORDING_STATUS.RECORDING) {
          // 检查浏览器支持的视频格式
          const videoTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
          let webcamSelectedMimeType = 'video/webm;codecs=vp8';
          
          for (const type of videoTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              webcamSelectedMimeType = type;
              break;
            }
          }
          
          // 停止当前摄像头录制
          if (window.globalMediaRecorderRef.webcamInstance) {
            window.globalMediaRecorderRef.webcamInstance.stop();
          }
          
          // 创建新的摄像头录制实例
          window.globalMediaRecorderRef.webcamInstance = new MediaRecorder(stream, {
            mimeType: webcamSelectedMimeType,
          });
          
          window.globalMediaRecorderRef.webcamInstance.ondataavailable = (e) => {
            if (e.data.size > 0) {
              window.globalMediaRecorderRef.webcamBlobs.push(e.data);
            }
          };
          
          window.globalMediaRecorderRef.webcamInstance.start(1000);
        }
        
        dispatch(setCameraEnabled(true));
        // 开启摄像头时自动显示悬浮窗
        dispatch(setCameraPreviewVisible(true));
      }
    } catch (error) {
      console.error('摄像头控制失败:', error);
      alert(`无法访问摄像头: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 切换麦克风状态
  const toggleMicrophone = async () => {
    setIsLoading(true);
    
    try {
      if (isMicOn) {
        // 关闭麦克风
        // 获取全局麦克风流并停止
        if (window.globalMediaRecorderRef?.audioStream) {
          const audioTracks = window.globalMediaRecorderRef.audioStream.getTracks().filter(track => track.kind === 'audio');
          audioTracks.forEach(track => track.stop());
          window.globalMediaRecorderRef.audioStream = null;
        }
        dispatch(setMicrophoneEnabled(false));
      } else {
        // 开启麦克风
        const constraints: MediaStreamConstraints = {
          video: false,
          audio: true
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.globalMediaRecorderRef.audioStream = stream;
        
        // 如果正在录制，创建新的麦克风录制实例
        if (recordingStatus === RECORDING_STATUS.RECORDING) {
          // 检查浏览器支持的音频格式
          const audioTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp3'];
          let audioSelectedMimeType = 'audio/webm';
          
          for (const type of audioTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              audioSelectedMimeType = type;
              break;
            }
          }
          
          // 停止当前麦克风录制
          if (window.globalMediaRecorderRef.audioInstance) {
            window.globalMediaRecorderRef.audioInstance.stop();
          }
          
          // 创建新的麦克风录制实例
          window.globalMediaRecorderRef.audioInstance = new MediaRecorder(stream, {
            mimeType: audioSelectedMimeType,
          });
          
          window.globalMediaRecorderRef.audioInstance.ondataavailable = (e) => {
            if (e.data.size > 0) {
              window.globalMediaRecorderRef.audioBlobs.push(e.data);
            }
          };
          
          window.globalMediaRecorderRef.audioInstance.start(1000);
        }
        
        dispatch(setMicrophoneEnabled(true));
      }
    } catch (error) {
      console.error('麦克风控制失败:', error);
      alert(`无法访问麦克风: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 按钮通用Props - 调整为小型圆形图标按钮
  const baseButtonProps: ButtonProps = {
    size: 'small',
    shape: 'circle',
    style: {
      width: '32px',
      height: '32px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
  
  // 获取摄像头预览悬浮窗状态
  const isCameraPreviewVisible = useAppSelector(state => state.mediastream.isCameraPreviewVisible);

  // 辅助函数：格式化录制时长
  const formatDuration = (duration: number): string => {
    if (!duration || isNaN(duration)) return '0秒';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  return (
    <>
      <Space direction="horizontal" size="small" style={{ alignItems: 'center' }}>
        {/* 开始按钮 */}
        <Tooltip title="开始录制" placement="top" overlayStyle={{ opacity: 0.8 }}>
          <Button
            {...baseButtonProps}
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={recordingStatus !== RECORDING_STATUS.NOT_RECORDING}
          />
        </Tooltip>

        {/* 暂停/恢复按钮 */}
        <Tooltip 
          title={recordingStatus === RECORDING_STATUS.RECORDING ? "暂停录制" : "恢复录制"} 
          placement="top"
          overlayStyle={{ opacity: 0.8 }}
        >
          <Button
            {...baseButtonProps}
            icon={recordingStatus === RECORDING_STATUS.RECORDING ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={recordingStatus === RECORDING_STATUS.RECORDING ? handlePause : handleResume}
            disabled={recordingStatus === RECORDING_STATUS.NOT_RECORDING}
          />
        </Tooltip>

        {/* 结束按钮 */}
        <Tooltip title="结束录制" placement="top" overlayStyle={{ opacity: 0.8 }}>
          <Button
            {...baseButtonProps}
            danger
            icon={<StopOutlined />}
            onClick={handleEnd}
            disabled={recordingStatus === RECORDING_STATUS.NOT_RECORDING}
          />
        </Tooltip>

        {/* 摄像头控制按钮 */}
        <Tooltip title={isCameraOn ? "关闭摄像头" : "打开摄像头"} placement="top" overlayStyle={{ opacity: 0.8 }}>
          <Button
            {...baseButtonProps}
            type={isCameraOn ? "primary" : "default"}
            icon={<CameraOutlined />}
            onClick={toggleCamera}
            loading={isLoading}
          />
        </Tooltip>

        {/* 麦克风控制按钮 */}
        <Tooltip title={isMicOn ? "关闭麦克风" : "打开麦克风"} placement="top" overlayStyle={{ opacity: 0.8 }}>
          <Button
            {...baseButtonProps}
            type={isMicOn ? "primary" : "default"}
            icon={isMicOn ? <AudioOutlined /> : <AudioMutedOutlined />}
            onClick={toggleMicrophone}
            loading={isLoading}
          />
        </Tooltip>
        
        {/* 摄像头预览悬浮窗控制按钮 */}
        <Tooltip title={isCameraPreviewVisible ? "隐藏摄像头悬浮窗" : "显示摄像头悬浮窗"} placement="top" overlayStyle={{ opacity: 0.8 }}>
          <Button
            {...baseButtonProps}
            type={isCameraPreviewVisible ? "primary" : "default"}
            icon={isCameraPreviewVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => dispatch(setCameraPreviewVisible(!isCameraPreviewVisible))}
          />
        </Tooltip>
      </Space>
      
      {/* 摄像头预览悬浮窗 */}
      <CameraPreview 
        isCameraOn={isCameraOn} 
        isVisible={isCameraPreviewVisible} 
      />
    </>
  );
};

export default ControlPanel;