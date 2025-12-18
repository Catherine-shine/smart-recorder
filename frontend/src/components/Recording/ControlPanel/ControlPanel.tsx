
import React, { useState } from 'react';
import { Button, Space, Tooltip, type ButtonProps } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CameraOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useRecordingScheduler } from '../../../utils/recording/RecordingScheduler';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { setCameraPreviewVisible } from '../../../store/slices/mediastreamSlice';
import CameraPreview from './cameraPreview';
import DeviceSelector from './DeviceSelector';
import { RECORDING_STATUS } from '../../../types/common';

const ControlPanel: React.FC = () => {
  const {
    recordingStatus,
    handleStart,
    handlePause,
    handleResume,
    handleEnd,
    toggleMicrophone,
    toggleCamera, 
  } = useRecordingScheduler();

  const dispatch = useAppDispatch();
  const isCameraOn = useAppSelector(state => state.mediastream.isCameraEnabled);
  const isMicOn = useAppSelector(state => state.mediastream.isMicrophoneEnabled);
  const isCameraPreviewVisible = useAppSelector(state => state.mediastream.isCameraPreviewVisible);
  const [isLoading, setIsLoading] = useState(false);

  // 包装方法：添加loading状态
  const wrappedToggleCamera = async () => {
    setIsLoading(true);
    await toggleCamera();
    setIsLoading(false);
  };

  const wrappedToggleMicrophone = async () => {
    setIsLoading(true);
    await toggleMicrophone();
    setIsLoading(false);
  };

  const baseButtonProps: ButtonProps = {
    size: 'small',
    shape: 'circle',
    style: {
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };

  return (
    <>
      <Space orientation="horizontal" size="small" align="center">
        {/* 开始按钮 */}
        <Tooltip title="开始录制" styles={{ root: { opacity: 0.8 } }}>
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
          styles={{ root: { opacity: 0.8 } }}
        >
          <Button
            {...baseButtonProps}
            icon={recordingStatus === RECORDING_STATUS.RECORDING ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={recordingStatus === RECORDING_STATUS.RECORDING ? handlePause : handleResume}
            disabled={recordingStatus === RECORDING_STATUS.NOT_RECORDING}
          />
        </Tooltip>

        {/* 结束按钮 */}
        <Tooltip title="结束录制" styles={{ root: { opacity: 0.8 } }}>
          <Button
            {...baseButtonProps}
            danger
            icon={<StopOutlined />}
            onClick={handleEnd}
            disabled={recordingStatus === RECORDING_STATUS.NOT_RECORDING}
          />
        </Tooltip>

        {/* 摄像头控制 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={isCameraOn ? "关闭摄像头" : "打开摄像头"} styles={{ root: { opacity: 0.8 } }}>
            <Button
              {...baseButtonProps}
              style={{ ...baseButtonProps.style, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              type={isCameraOn ? "primary" : "default"}
              icon={<CameraOutlined />}
              onClick={wrappedToggleCamera}
              loading={isLoading}
            />
          </Tooltip>
          <DeviceSelector type="video" />
        </div>

        {/* 麦克风控制 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={isMicOn ? "关闭麦克风" : "打开麦克风"} styles={{ root: { opacity: 0.8 } }}>
            <Button
              {...baseButtonProps}
              style={{ ...baseButtonProps.style, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              type={isMicOn ? "primary" : "default"}
              icon={isMicOn ? <AudioOutlined /> : <AudioMutedOutlined />}
              onClick={wrappedToggleMicrophone}
              loading={isLoading}
            />
          </Tooltip>
          <DeviceSelector type="audio" />
        </div>

        {/* 摄像头预览控制 */}
        <Tooltip
          title={isCameraPreviewVisible ? "隐藏摄像头悬浮窗" : "显示摄像头悬浮窗"}
          styles={{ root: { opacity: 0.8 } }}
        >
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