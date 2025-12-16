import type { RootState } from '../../../store';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { setPlaybackUrl, setDuration, setRecordList, resetPlaybackState, setCurrentVideo, setWebcamUrl, setAudioUrl, setTrajectoryData } from '../../../store/slices/playbackSlice';
import { RECORDING_STATUS } from '../../../types/common'
// 引入录制切片的选择器和action
import { 
  selectCollectedData, 
  selectLastRecordingDuration,
  selectRecordingStatus,
  resetRecordingState,
  setLastRecordingDuration,
  collectData
} from '../../../store/slices/recordingSlice';
import type { PlayStatus } from '../../../types/playback/playbackbody';
import {  Card, Empty, Typography, Tag, Spin, message, Tabs, Button, Modal } from 'antd';
import { UploadOutlined, DeleteOutlined, HddOutlined } from '@ant-design/icons';
import React from "react";
import { formatDuration } from '../../../utils/playback/playback';
import { v4 as uuidv4 } from 'uuid'; // 需安装：npm install uuid
import { uploadRecording } from '../../../api/recording';
import { getRecordings, deleteRecording as deleteLocalRecording } from '../../../utils/db';

import './index.css';
import type { RecordingListItem } from '../../../types/api/apiTypes'; // 按实际路径调整


const { Text, Title } = Typography;
interface PlaybackListProps {
  onSelectRecording?: (recordingId: string) => Promise<void>;
  onSelectLocalRecording?: (recording: any) => void;
}
// 初始 Mock 数据


const PlaybackList: React.FC<PlaybackListProps> = ({onSelectRecording, onSelectLocalRecording}) => {
  const dispatch = useDispatch();
  const [localRecordings, setLocalRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 获取本地录制列表
  const fetchLocalRecordings = async () => {
    try {
      setLoading(true);
      const recordings = await getRecordings();
      // 按时间倒序排列
      recordings.sort((a, b) => b.timestamp - a.timestamp);
      setLocalRecordings(recordings);
    } catch (error) {
      console.error('获取本地录制列表失败:', error);
      messageApi.error('获取本地录制列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalRecordings();
  }, []);

  // 处理本地录制选择
  const handleLocalSelect = (recording: any) => {
    setSelectedId(recording.id);
    
    // 构造播放所需的URL
    const videoUrl = URL.createObjectURL(recording.videoBlob);
    const audioUrl = recording.audioBlob ? URL.createObjectURL(recording.audioBlob) : undefined;
    const webcamUrl = recording.webcamBlob ? URL.createObjectURL(recording.webcamBlob) : undefined;

    // 更新Redux状态
    dispatch(setPlaybackUrl(videoUrl));
    if (audioUrl) dispatch(setAudioUrl(audioUrl));
    if (webcamUrl) dispatch(setWebcamUrl(webcamUrl));
    
    dispatch(setDuration(recording.duration / 1000)); // 转换为秒
    
    // 设置轨迹数据
    const trajectoryData = {
      whiteboard: recording.whiteboardData || [],
      mouse: recording.mouseData || [],
      audioStateChanges: recording.audioStateChanges || [],
      cameraStateChanges: recording.cameraStateChanges || []
    };
    dispatch(setTrajectoryData(trajectoryData));

    // 通知父组件
    if (onSelectLocalRecording) {
      onSelectLocalRecording(recording);
    }
  };

  // 上传本地录制
  const handleUpload = async (recording: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      messageApi.loading({ content: '正在上传...', key: 'upload' });
      
      const trajectoryData = JSON.stringify({
        whiteboardData: recording.whiteboardData,
        mouseData: recording.mouseData
      });

      await uploadRecording({
        audio: recording.audioBlob || new File([''], 'audio.webm', { type: 'audio/webm' }),
        trajectory: new File([trajectoryData], 'trajectory.json', { type: 'application/json' }),
        screen_recording: new File([recording.videoBlob], 'screen_recording.webm', { type: recording.videoBlob.type }),
        webcam_recording: recording.webcamBlob ? new File([recording.webcamBlob], 'webcam_recording.webm', { type: recording.webcamBlob.type }) : undefined
      });

      // 更新本地状态为已上传
      // await updateRecordingStatus(recording.id, true); // 需要在db.ts中实现
      messageApi.success({ content: '上传成功', key: 'upload' });
      
      // 刷新列表
      fetchLocalRecordings();
    } catch (error) {
      console.error('上传失败:', error);
      messageApi.error({ content: '上传失败', key: 'upload' });
    }
  };

  // 删除本地录制
  const handleDeleteLocal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条本地录制吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await deleteLocalRecording(id);
          messageApi.success('删除成功');
          fetchLocalRecordings();
          if (selectedId === id) {
            dispatch(resetPlaybackState());
            setSelectedId(null);
          }
        } catch (error) {
          messageApi.error('删除失败');
        }
      }
    });
  };

  const renderLocalList = () => (
    <div className="playback-list">
      {localRecordings.length === 0 ? (
        <Empty description="暂无本地录制" />
      ) : (
        localRecordings.map((item) => (
          <Card
            key={item.id}
            className={`playback-item ${selectedId === item.id ? 'selected' : ''}`}
            onClick={() => handleLocalSelect(item)}
            hoverable
            size="small"
          >
            <div className="playback-item-content">
              <div className="playback-item-info">
                <Text strong ellipsis>{item.name}</Text>
                <div className="playback-item-meta">
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </Text>
                  <Tag color="blue">{formatDuration(item.duration / 1000)}</Tag>
                </div>
              </div>
              <div className="playback-item-actions">
                <Button 
                  type="text" 
                  icon={<UploadOutlined />} 
                  onClick={(e) => handleUpload(item, e)}
                  title="上传到云端"
                />
                <Button 
                  type="text" 
                  danger
                  icon={<DeleteOutlined />} 
                  onClick={(e) => handleDeleteLocal(item.id, e)}
                  title="删除"
                />
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );



  return (
    <div className="playback-list-container">
      {contextHolder}
      <Tabs
        defaultActiveKey="local"
        items={[
          {
            key: 'local',
            label: (
              <span>
                <HddOutlined />
                本地录制
              </span>
            ),
            children: loading ? <div className="loading-container"><Spin /></div> : renderLocalList(),
          },
        ]}
      />
    </div>
  );
};

export default PlaybackList;
