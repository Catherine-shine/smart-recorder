
import { useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { setPlaybackUrl, setDuration, resetPlaybackState,  setWebcamUrl, setAudioUrl, setTrajectoryData } from '../../../store/slices/playbackSlice';
import {  Card, Empty, Typography, Tag, Spin, message,  Button, Modal } from 'antd';
import { UploadOutlined, DeleteOutlined, } from '@ant-design/icons';
import React from "react";
import { formatDuration } from '../../../utils/playback/playback';
import { uploadRecording } from '../../../api/recording';
import { getRecordings, deleteRecording as deleteLocalRecording } from '../../../utils/db';
import './index.css';



const { Text} = Typography;
interface PlaybackListProps {
  onSelectRecording?: (recordingId: string) => Promise<void>;
  onSelectLocalRecording?: (recording: any) => void;
}



const PlaybackList: React.FC<PlaybackListProps> = ({ onSelectLocalRecording}) => {
  const dispatch = useDispatch();
  const [localRecordings, setLocalRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  
  // 用于跟踪已创建的Blob URL，以便清理
  const createdUrlsRef = useRef<{video?: string, audio?: string, webcam?: string}>({});

  // 组件卸载时清理URL
  useEffect(() => {
    return () => {
      const urls = createdUrlsRef.current;
      if (urls.video) URL.revokeObjectURL(urls.video);
      if (urls.audio) URL.revokeObjectURL(urls.audio);
      if (urls.webcam) URL.revokeObjectURL(urls.webcam);
    };
  }, []);

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
    
    // 清理旧的URL
    const oldUrls = createdUrlsRef.current;
    if (oldUrls.video) URL.revokeObjectURL(oldUrls.video);
    if (oldUrls.audio) URL.revokeObjectURL(oldUrls.audio);
    if (oldUrls.webcam) URL.revokeObjectURL(oldUrls.webcam);
    
    // 构造播放所需的URL
    const videoUrl = URL.createObjectURL(recording.videoBlob);
    const audioUrl = recording.audioBlob ? URL.createObjectURL(recording.audioBlob) : undefined;
    const webcamUrl = recording.webcamBlob ? URL.createObjectURL(recording.webcamBlob) : undefined;
    
    // 保存新的URL引用
    createdUrlsRef.current = {
      video: videoUrl,
      audio: audioUrl,
      webcam: webcamUrl
    };

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
                    {new Date(item.timestamp).toLocaleString(undefined, {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })}
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
      {loading ? (
        <div className="loading-container"><Spin /></div>
      ) : (
        renderLocalList()
      )}
    </div>
  );
};

export default PlaybackList;
