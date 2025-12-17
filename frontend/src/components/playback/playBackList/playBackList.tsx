
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState, useRef } from 'react';
import { setPlaybackUrl, setDuration, resetPlaybackState,  setWebcamUrl, setAudioUrl, setTrajectoryData, setSelectedLocalRecordingId } from '../../../store/slices/playbackSlice';
import {  Card, Empty, Typography, Tag, Spin, message,  Button, Modal } from 'antd';
import { UploadOutlined, DeleteOutlined, } from '@ant-design/icons';
import React from "react";
import { formatDuration } from '../../../utils/playback/playback';
import { uploadRecording } from '../../../api/recording';
import { getRecordings, deleteRecording as deleteLocalRecording, updateRecordingUploadStatus } from '../../../utils/db';
import './index.css';
import { ShareAltOutlined } from '@ant-design/icons';
import type { RootState } from '../../../store';



const { Text} = Typography;
interface PlaybackListProps {
  onSelectRecording?: (recordingId: string) => Promise<void>;
  onSelectLocalRecording?: (recording: any) => void;
}



const PlaybackList: React.FC<PlaybackListProps> = ({ onSelectLocalRecording}) => {
  const dispatch = useDispatch();
  const [localRecordings, setLocalRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // 使用Redux状态存储选中的录制ID，而不是组件内部state
  const selectedId = useSelector((state: RootState) => state.playback?.selectedLocalRecordingId || null);
  const [messageApi, contextHolder] = message.useMessage();
  
  // 用于跟踪当前实际选中的录制ID，避免重复选择
  const [currentSelectedId, setCurrentSelectedId] = useState<string | null>(null);
  
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
      
      // 只有在没有选中视频且首次加载时才默认选中第一个视频
      // 避免刷新页面后跳回第一个视频
      if (recordings.length > 0 && !selectedId) {
        // 没有选中视频时，默认选中第一个视频
        handleLocalSelect(recordings[0]);
      } else if (recordings.length > 0 && selectedId) {
        // 如果有选中的录制ID，尝试找到对应的录制并选择它
        const selectedRecording = recordings.find(recording => recording.id === selectedId);
        if (selectedRecording) {
          handleLocalSelect(selectedRecording);
        }
      }
    } catch (error) {
      console.error('获取本地录制列表失败:', error);
      messageApi.error('获取本地录制列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取录制列表
  useEffect(() => {
    fetchLocalRecordings();
  }, []);

  // 监听selectedId的变化，当Redux持久化状态恢复后，自动选择对应的录制
  useEffect(() => {
    // 只有当selectedId存在且本地录制列表已加载时才执行
    // 移除selectedId !== currentSelectedId条件，确保每次selectedId变化或组件重新挂载时
    // 都能重新创建有效的Blob URL，避免使用已失效的Blob URL
    if (selectedId && localRecordings.length > 0) {
      const selectedRecording = localRecordings.find(recording => recording.id === selectedId);
      if (selectedRecording) {
        handleLocalSelect(selectedRecording);
      }
    }
  }, [selectedId, localRecordings]);

  // 处理本地录制选择
  const handleLocalSelect = (recording: any) => {
    // 更新当前选中的录制ID状态
    setCurrentSelectedId(recording.id);
    
    // 使用Redux状态存储选中的录制ID
    dispatch(setSelectedLocalRecordingId(recording.id));
    
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
    
    if (!recording.videoBlob) {
      messageApi.error({ content: '缺少录屏文件，无法上传', key: 'upload' });
      return;
    }

    try {
      messageApi.loading({ content: '正在上传...', key: 'upload' });
      
      // 轨迹文件不再上传
      // const trajectoryData = JSON.stringify({
      //   whiteboardData: recording.whiteboardData,
      //   mouseData: recording.mouseData
      // });

      const response = await uploadRecording({
        audio: recording.audioBlob || new File([''], 'audio.webm', { type: 'audio/webm' }),
        // trajectory: new File([trajectoryData], 'trajectory.json', { type: 'application/json' }),
        screen_recording: new File([recording.videoBlob], 'screen_recording.webm', { type: recording.videoBlob.type }),
        webcam_recording: recording.webcamBlob ? new File([recording.webcamBlob], 'webcam_recording.webm', { type: recording.webcamBlob.type }) : undefined,
        audio_state_changes: recording.audioStateChanges,
        camera_state_changes: recording.cameraStateChanges,
        total_duration: recording.duration * 1000
      });

      // 更新本地状态为已上传，并保存hashid
      await updateRecordingUploadStatus(recording.id, response.hashid);
  
      messageApi.success({ content: '上传成功', key: 'upload' });
      
      // 刷新列表
      fetchLocalRecordings();
    } catch (error) {
      console.error('上传失败:', error);
      messageApi.error({ content: '上传失败', key: 'upload' });
    }
  };

  // 分享录制
  const handleShare = (hashid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/share?hashid=${hashid}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      messageApi.success('分享链接已复制到剪贴板');
    }).catch(() => {
      messageApi.error('复制失败，请手动复制');
    });
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
            // 使用Redux状态存储选中的录制ID
            dispatch(setSelectedLocalRecordingId(null));
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
                {item.isUploaded && item.uploadHashId ? (
                  <Button 
                    type="text" 
                    icon={<ShareAltOutlined />} 
                    onClick={(e) => handleShare(item.uploadHashId!, e)}
                    title="分享"
                    style={{ color: '#52c41a' }}
                  />
                ) : (
                  <Button 
                    type="text" 
                    icon={<UploadOutlined />} 
                    onClick={(e) => handleUpload(item, e)}
                    title="上传到云端"
                  />
                )}
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
      <div className="playback-list-card">
        {loading ? (
          <div className="loading-container"><Spin /></div>
        ) : (
          renderLocalList()
        )}
      </div>
    </div>
  );
};

export default PlaybackList;
