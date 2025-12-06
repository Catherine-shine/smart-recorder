import React from 'react';
import { Button, Space, type ButtonProps, Card, Alert, Typography } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useRecordingScheduler } from '../../../utils/recording/RecordingScheduler';
import { useAppSelector } from '../../../store/hooks';
import { selectLastRecordingDuration } from '../../../store/slices/recordingSlice';
import { RECORDING_STATUS } from '../../../types/common';

const { Text } = Typography;

const ControlPanel: React.FC = () => {
  const {
    recordingStatus,
    handleStart,
    handlePause,
    handleResume,
    handleEnd,
  } = useRecordingScheduler();
  // 获取最后一次录制时长
  const lastRecordingDuration = useAppSelector(selectLastRecordingDuration);

  // 按钮通用Props
  const baseButtonProps: ButtonProps = {
    size: 'small',
    block: true,
    iconPlacement: 'start',
    style: {
      height: '32px',
      fontSize: '13px',
      padding: '0 16px',
      borderRadius: '6px',
    },
  };

  // 格式化时长（毫秒转 分:秒）
  const formatDuration = (ms: number | null) => {
    if (!ms) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor(ms / 1000 / 60); // 去掉% 60，这样可以处理超过60分钟的情况
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className="lark-card"
      style={{ borderRadius: '8px' }}
      styles={{
        body: {
          padding: '20px', 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
        }
      }}
    >
      {/* 最后一次录制时长提示 */}
      {lastRecordingDuration && (
        <Text type="secondary" style={{ width: '100%', maxWidth: '180px', textAlign: 'center' }}>
          上一次录制时长：{formatDuration(lastRecordingDuration)}
        </Text>
      )}

      <Space orientation="vertical" size="small" style={{ width: '100%', maxWidth: '180px' }}>
        {/* 开始按钮 */}
        <Button
          {...baseButtonProps}
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleStart}
          disabled={recordingStatus !== RECORDING_STATUS.NOT_RECORDING}
        >
          开始
        </Button>

        {/* 暂停/恢复按钮 */}
        <Button
          {...baseButtonProps}
          icon={recordingStatus === RECORDING_STATUS.RECORDING ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={recordingStatus === RECORDING_STATUS.RECORDING ? handlePause : handleResume}
          disabled={recordingStatus === RECORDING_STATUS.NOT_RECORDING}
        >
          {recordingStatus === RECORDING_STATUS.RECORDING ? '暂停' : '恢复'}
        </Button>

        {/* 结束按钮 */}
        <Button
          {...baseButtonProps}
          danger
          icon={<StopOutlined />}
          onClick={handleEnd}
          disabled={recordingStatus === RECORDING_STATUS.NOT_RECORDING}
        >
          结束
        </Button>

        {/* 录制状态提示 */}
        {recordingStatus === RECORDING_STATUS.RECORDING && (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#f50', marginTop: '8px' }}>
            正在录屏...
          </div>
        )}
        {recordingStatus === RECORDING_STATUS.PAUSED && (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#1890ff', marginTop: '8px' }}>
            录屏已暂停
          </div>
        )}
      </Space>
    </Card>
  );
};

export default ControlPanel;