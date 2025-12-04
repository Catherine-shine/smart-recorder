import React from 'react';
import { Button, Space, type ButtonProps, Card } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useRecordingScheduler } from '../../../utils/recording/RecordingScheduler';
import { RECORDING_STATUS } from '../../../types/common';

const ControlPanel: React.FC = () => {
  const {
    recordingStatus,
    handleStart,
    handlePause,
    handleResume,
    handleEnd,
  } = useRecordingScheduler();

  // 按钮通用Props
  const baseButtonProps: ButtonProps = {
    size: 'small',
    block: true, // 按钮占满宽度
    iconPosition: 'start', // 图标在文字前面
    style: {
      height: '32px', // 保持按钮高度
      fontSize: '13px', // 保持字体大小
      padding: '0 16px', // 与视频预览区保持一致的内边距
      borderRadius: '6px', // 圆角与卡片保持一致
    },
  };

  return (
    <Card 
      className="lark-card"
      style={{ 
        borderRadius: '8px',
      }}
      bodyStyle={{ 
        padding: '20px', // 与视频预览区保持一致的内边距
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%', maxWidth: '180px' }}>
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
          icon={<PauseCircleOutlined />}
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
      </Space>
    </Card>
  );
};

export default ControlPanel;