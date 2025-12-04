// src/components/playback/playbackList/PlaybackList.tsx
import type { RootState } from '../../../store';
import { useSelector,useDispatch  } from 'react-redux';
import { setPlaybackUrl } from '../../../store/slices/playbackSlice';
import type { PlayStatus } from '../../../types/playback/playbackbody';
import { List, Card, Empty, Typography, Tag ,Spin} from 'antd';
import type { PlaybackVideoItem } from '../../../types/playback/playbackbody';
import {  message, } from 'antd';
import React, { useState, useEffect } from "react";
import { formatDuration } from '../../../utils/playback/playback';
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
      setPlayStatus('stopped'); 
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
                {/* 列表项内容：还原原 List.Item.Meta 的布局 */}
                <div className="list-item-content">
                  {/* 视频标题：保留原样式和省略效果 */}
                  <Text ellipsis className="video-title">
                    {video.title}
                  </Text>
                  {/* 视频元信息：时间 + 时长标签，保留原 flex 布局 */}
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