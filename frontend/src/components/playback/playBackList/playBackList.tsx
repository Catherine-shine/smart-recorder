// src/components/playback/playbackList/PlaybackList.tsx
import type { RootState } from '../../../store';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { setPlaybackUrl } from '../../../store/slices/playbackSlice';
import { RECORDING_STATUS } from '../../../types/common'
// 引入录制切片的选择器
import { 
  selectCollectedData, 
  selectLastRecordingDuration,
  selectRecordingStatus
} from '../../../store/slices/recordingSlice';
import type { PlayStatus } from '../../../types/playback/playbackbody';
import type { PlaybackVideoItem } from '../../../types/playback/playbackbody';
import { List, Card, Empty, Typography, Tag, Spin, message } from 'antd';
import React from "react";
import { formatDuration } from '../../../utils/playback/playback';
import { v4 as uuidv4 } from 'uuid'; // 需安装：npm install uuid
import './index.css';

const { Text, Title } = Typography;

// 初始 Mock 数据
const MOCK_VIDEO_LIST: PlaybackVideoItem[] = [
  {
    id: '1',
    title: '首页操作录屏',
    url: 'https://www.w3school.com.cn/i/movie.mp4',
    duration: 120,
    createTime: '2025-11-29 10:00',
    isLocalRecord: false,
  },
  {
    id: '2',
    title: '用户管理模块录屏',
    url: 'https://demo.com/videos/user-manage.mp4',
    duration: 180,
    createTime: '2025-11-29 11:00',
    isLocalRecord: false,
  },
  {
    id: '3',
    title: '数据统计录屏',
    url: 'https://demo.com/videos/stat.mp4',
    duration: 240,
    createTime: '2025-11-29 14:00',
    isLocalRecord: false,
  },
];

const PlaybackList: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedVideoIdProp, setSelectedVideoIdProp] = useState<string | null>(null);
  const [videoListProp, setVideoListProp] = useState<PlaybackVideoItem[]>(() => {
    // 从 localStorage 恢复录制的视频（可选：避免刷新丢失）
    const savedLocalVideos = localStorage.getItem('localRecordedVideos');
    return savedLocalVideos ? JSON.parse(savedLocalVideos) : MOCK_VIDEO_LIST;
  });
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [playStatus, setPlayStatus] = useState<PlayStatus>('stopped');
  const [videoLoading, setVideoLoading] = useState<boolean>(false);

  // 从 Redux 获取录制相关数据
  const { videoBlob } = useSelector(selectCollectedData); // 录制的视频 Blob
  const lastRecordingDuration = useSelector(selectLastRecordingDuration); // 录制时长（毫秒）
  const recordingStatus = useSelector(selectRecordingStatus); // 录制状态
  const { playbackUrl } = useSelector((state: RootState) => state.playback);

  // 存储已生成的 blob URL（用于组件卸载时释放内存）
  const blobUrlRef = useRef<Record<string, string>>({});

  // 核心逻辑：录制结束后，将视频添加到播放列表
  useEffect(() => {
    // 触发条件：录制状态变为未录制 + 有视频 Blob + 有录制时长
    if (
      recordingStatus === RECORDING_STATUS.NOT_RECORDING &&
      videoBlob && 
      lastRecordingDuration !== null
    ) {
      // 1. 生成 Blob URL（可直接在 video 中播放）
      const blobUrl = URL.createObjectURL(videoBlob);
      // 2. 生成视频项（默认标题 + 时间戳命名）
      const now = new Date();
      const createTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newVideoItem: PlaybackVideoItem = {
        id: uuidv4(), // 唯一 ID
        title: `本地录屏_${createTime}`,
        url: blobUrl,
        duration: Math.floor(lastRecordingDuration / 1000), // 转为秒（适配原有 formatDuration）
        createTime,
        isLocalRecord: true, // 标记为本地录制视频
      };

      // 3. 避免重复添加（通过 blob URL 去重）
      const isDuplicate = videoListProp.some(item => item.url === blobUrl);
      if (!isDuplicate) {
        const newVideoList = [newVideoItem, ...videoListProp]; // 新视频置顶
        setVideoListProp(newVideoList);
        // 4. 保存到 localStorage（可选：持久化）
        localStorage.setItem('localRecordedVideos', JSON.stringify(newVideoList));
        // 5. 缓存 blob URL 用于后续释放
        blobUrlRef.current[newVideoItem.id] = blobUrl;
        // 6. 自动选中新录制的视频
        setSelectedVideoIdProp(newVideoItem.id);
        dispatch(setPlaybackUrl(newVideoItem.url));
        message.success('新录制的视频已添加到播放列表！');
      }
    }
  }, [recordingStatus, videoBlob, lastRecordingDuration, videoListProp, dispatch]);

  // 处理视频选择逻辑
  const handleVideoSelect = (video: PlaybackVideoItem) => {
    setSelectedVideoIdProp(video.id);
    setPlayStatus('stopped');
    setVideoLoading(true);
    dispatch(setPlaybackUrl(video.url));
    // 模拟加载完成（可通过 video 标签的 canplay 事件优化）
    setTimeout(() => setVideoLoading(false), 800);
    message.success(`已切换至：${video.title}`);
  };

  // 初始化：选中第一个视频
  useEffect(() => {
    if (videoListProp.length > 0 && !selectedVideoIdProp) {
      setSelectedVideoIdProp(videoListProp[0].id);
      dispatch(setPlaybackUrl(videoListProp[0].url));
    }
  }, [videoListProp, dispatch, selectedVideoIdProp]);

  // 组件卸载：释放所有 blob URL（避免内存泄漏）
  useEffect(() => {
    return () => {
      Object.values(blobUrlRef.current).forEach(blobUrl => {
        URL.revokeObjectURL(blobUrl);
      });
    };
  }, []);

  // 可选：清空录制视频列表（可暴露为按钮点击事件）
  const clearLocalVideos = () => {
    // 释放所有 blob URL
    videoListProp
      .filter(item => item.isLocalRecord)
      .forEach(item => {
        if (blobUrlRef.current[item.id]) {
          URL.revokeObjectURL(blobUrlRef.current[item.id]);
          delete blobUrlRef.current[item.id];
        }
      });
    // 保留 Mock 数据，清空录制视频
    const mockOnlyList = MOCK_VIDEO_LIST;
    setVideoListProp(mockOnlyList);
    localStorage.setItem('localRecordedVideos', JSON.stringify(mockOnlyList));
    message.success('已清空本地录制视频！');
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5}>回放视频列表</Title>
          {/* 可选：添加清空本地录制视频按钮 */}
          <Text 
            type="secondary"
            onClick={clearLocalVideos}
            style={{ cursor: 'pointer' }}
          >
            清空本地录屏
          </Text>
        </div>
      }
      className="playback-list-card"
      variant="outlined" 
    >
      <Spin spinning={listLoading} className="playback-list">
        {videoListProp.length === 0 && !listLoading ? (
          <Empty description="暂无回放视频数据" style={{ margin: '20px 0' }} />
        ) : (
          <div className="video-list-container">
            {videoListProp.map((video) => (
              <div
                key={video.id} 
                className={`playback-list-item ${selectedVideoIdProp === video.id ? 'active' : ''}`}
                onClick={() => handleVideoSelect(video)}
                style={{ cursor: 'pointer' }}
              >
                <div className="list-item-content">
                  {/* 视频标题：本地录制视频标记 */}
                  <Text ellipsis className="video-title">
                    {video.isLocalRecord ? `🟢 ${video.title}` : video.title}
                  </Text>
                  {/* 视频元信息 */}
                  <div className="video-meta">
                    <Text type="secondary">
                      {video.createTime || '无录制时间'}
                    </Text>
                    <Tag className="duration-tag">
                      {formatDuration(video.duration)}
                    </Tag>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default PlaybackList;