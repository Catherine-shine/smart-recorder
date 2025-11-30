// src/components/playback/playbackList/PlaybackList.tsx
import type { RootState } from '../../../store';
import { useSelector,useDispatch  } from 'react-redux';
import { setPlaybackUrl } from '../../../store/slices/playbackSlice';
import type { PlayStatus } from '../../../types/playback';
import { List, Card, Empty, Typography, Tag } from 'antd';
import type { PlaybackVideoItem } from '../../../types/playback';
import { Row, Col, message, Spin } from 'antd';
import React, { useState, useRef, useEffect } from "react";
import { formatDuration } from '../../../utils/playback';
import {type PlaybackListProps } from '../../../types/playback';
import './index.css';

const { Text, Title } = Typography;

const MOCK_VIDEO_LIST: PlaybackVideoItem[] = [
  {
    id: '1',
    title: '首页操作录屏',
    url: 'https://www.w3school.com.cn/i/movie.mp4',
    duration: 120,
    createTime: '2025-11-29 10:00',
  },
  {
    id: '2',
    title: '用户管理模块录屏',
    url: 'https://demo.com/videos/user-manage.mp4', // 测试地址，可替换
    duration: 180,
    createTime: '2025-11-29 11:00',
  },
  {
    id: '3',
    title: '数据统计录屏',
    url: 'https://demo.com/videos/stat.mp4',
    duration: 240,
    createTime: '2025-11-29 14:00',
  },
];


// 列表组件Props类型
// interface PlaybackListProps {
//   videoList: PlaybackVideoItem[]; // 回放列表数据
//   selectedVideoId: string | null; // 选中的视频ID
//   onVideoSelect: (video: PlaybackVideoItem) => void; // 选中视频的回调
//   loading?: boolean; // 列表加载状态
// }

const PlaybackList: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedVideoIdProp, setSelectedVideoIdProp] = useState<string | null>(null);
  const [videoListProp, setVideoListProp] = useState<PlaybackVideoItem[]>(MOCK_VIDEO_LIST);
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [playStatus, setPlayStatus] = useState<PlayStatus>('stopped');
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const { playbackUrl } = useSelector((state: RootState) => state.playback);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  // 优先使用Redux的地址，兜底用测试地址（建议替换为本地视频）
  const videoSrc = playbackUrl || 'https://www.w3school.com.cn/i/movie.mp4';

    const handleVideoSelect = (video: PlaybackVideoItem) => {
      setSelectedVideoIdProp(video.id);
      setPlayStatus('stopped'); // 切换视频时停止当前播放
      setVideoLoading(true);
      // 分发Redux Action更新播放地址
      dispatch(setPlaybackUrl(video.url)); 
      // 视频加载完成后取消loading（可通过video的canplay事件优化）
      setTimeout(() => setVideoLoading(false), 800);
      message.success(`已切换至：${video.title}`);
    };

     useEffect(() => {
        if (videoListProp.length > 0 && !selectedVideoIdProp) {
          setSelectedVideoIdProp(videoListProp[0].id);
          dispatch(setPlaybackUrl(videoListProp[0].url));
        }
      }, [videoListProp, dispatch, selectedVideoIdProp]);
  

  return (
    <Card 
      title={<Title level={5}>回放视频列表</Title>}
      className="playback-list-card"
      bordered
    >
      <List
        loading={listLoading}
        dataSource={videoListProp}
        renderItem={(video) => (
          <List.Item
            className={`playback-list-item ${selectedVideoIdProp === video.id ? 'active' : ''}`}
            onClick={() => handleVideoSelect(video)}
            style={{ cursor: 'pointer' }}
          >
            <List.Item.Meta
              title={
                <Text ellipsis className="video-title">
                  {video.title}
                </Text>
              }
              description={
                <div className="video-meta">
                  <Text type="secondary">
                    {video.createTime || '无录制时间'}
                  </Text>
                  <Tag className="duration-tag">
                    {formatDuration(video.duration)}
                  </Tag>
                </div>
              }
            />
          </List.Item>
        )}
        locale={{ emptyText: <Empty description="暂无回放视频数据" /> }}
        className="playback-list"
      />
    </Card>
  );
};

export default PlaybackList;