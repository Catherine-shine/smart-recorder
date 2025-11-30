import React, { useState } from 'react';
import { Layout, List, Button, Typography, message, Tooltip, Space } from 'antd';
import { PlayCircleOutlined, CloudUploadOutlined, DeleteOutlined, SaveOutlined, PlusOutlined, LinkOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../store';
import { deleteRecording, updateRecordingById, type Recording } from '../../store/slices/whiteboardSlice';
import { dataURLtoBlob } from './whiteboard';

const { Sider } = Layout;
const { Text } = Typography;

interface PlaybackSidebarProps {
  onPlay: (recording: Recording) => void;
  onLoad: (recording: Recording) => void;
  onSave: () => void;
  onNew: () => void;
}

export const PlaybackSidebar: React.FC<PlaybackSidebarProps> = ({ onPlay, onLoad, onSave, onNew }) => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useAppDispatch();
  const recordings = useAppSelector(state => state.whiteboard.recordings);
  const currentRecordingId = useAppSelector(state => state.whiteboard.currentRecordingId);

  const handleCloudUpload = async (id: string) => {
    const recording = recordings.find(r => r.id === id);
    if (!recording) return;

    const hide = message.loading('正在上传...', 0);
    try {
        const formData = new FormData();
        
        // Audio
        if (recording.audioUrl) {
            const audioBlob = dataURLtoBlob(recording.audioUrl);
            formData.append('audio', audioBlob, 'recording.webm');
        } else {
            formData.append('audio', new Blob([], { type: 'audio/webm' }), 'empty.webm');
        }

        // Trajectory
        const trajectoryBlob = new Blob([JSON.stringify(recording.actions)], { type: 'application/json' });
        formData.append('trajectory', trajectoryBlob, 'trajectory.json');

        const response = await fetch('/api/recordings', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        
        dispatch(updateRecordingById({ 
            id, 
            changes: { shareId: data.hashid } 
        }));
        
        message.success('上传成功');
    } catch (error) {
        console.error(error);
        message.error('上传失败');
    } finally {
        hide();
    }
  };

  const handleCopyLink = (shareId: string) => {
      const url = `${window.location.origin}/share?hashid=${shareId}`;
      navigator.clipboard.writeText(url).then(() => {
          message.success('链接已复制');
      });
  };

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={setCollapsed}
      reverseArrow
      width="25%"
      theme="light"
      style={{ borderLeft: '1px solid #f0f0f0', height: '100vh', overflow: 'auto', zIndex: 1000 }}
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {!collapsed && (
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block icon={<SaveOutlined />} onClick={onSave}>
                {currentRecordingId ? '保存修改' : '保存会话'}
                </Button>
                <Button block icon={<PlusOutlined />} onClick={onNew}>
                新建画板
                </Button>
            </Space>
          </div>
        )}
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
            <List
            dataSource={recordings}
            renderItem={item => (
                <List.Item
                style={{ 
                    padding: collapsed ? '8px 0' : '12px',
                    backgroundColor: currentRecordingId === item.id ? '#e6f7ff' : 'transparent',
                    cursor: 'pointer'
                }}
                onClick={() => {
                    onLoad(item);
                }}
                actions={!collapsed ? [
                    <Space size={0} key="actions">
                        <Tooltip title="回放">
                            <Button 
                                size="small"
                                type="text" 
                                icon={<PlayCircleOutlined />} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlay(item);
                                }}
                            />
                        </Tooltip>
                        {item.shareId ? (
                             <Tooltip title="复制链接">
                                <Button 
                                    size="small"
                                    type="text" 
                                    style={{ color: '#52c41a' }}
                                    icon={<LinkOutlined />} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyLink(item.shareId!);
                                    }}
                                />
                            </Tooltip>
                        ) : (
                            <Tooltip title="上传">
                                <Button 
                                    size="small"
                                    type="text" 
                                    icon={<CloudUploadOutlined />} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloudUpload(item.id);
                                    }}
                                />
                            </Tooltip>
                        )}
                        <Tooltip title="删除">
                            <Button 
                                size="small"
                                type="text" 
                                danger
                                icon={<DeleteOutlined />} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(deleteRecording(item.id));
                                }}
                            />
                        </Tooltip>
                    </Space>
                ] : []}
                >
                {!collapsed ? (
                    <List.Item.Meta
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Text ellipsis style={{ maxWidth: 100 }}>{item.name}</Text>
                            {item.shareId && <CheckCircleOutlined style={{ fontSize: 10, color: '#52c41a' }} />}
                        </div>
                    }
                    description={<Text type="secondary" style={{ fontSize: '10px' }}>{new Date(item.createdAt).toLocaleTimeString()}</Text>}
                    />
                ) : (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                        <Tooltip title={item.name} placement="left">
                            <Button 
                                type="text" 
                                icon={<PlayCircleOutlined />} 
                                onClick={() => onLoad(item)}
                            />
                        </Tooltip>
                    </div>
                )}
                </List.Item>
            )}
            />
        </div>
      </div>
    </Sider>
  );
};
