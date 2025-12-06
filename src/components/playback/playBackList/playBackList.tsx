
import type { RootState } from '../../../store';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { setPlaybackUrl, setDuration } from '../../../store/slices/playbackSlice';
import { RECORDING_STATUS } from '../../../types/common'
// 引入录制切片的选择器
import { 
  selectCollectedData, 
  selectLastRecordingDuration,
  selectRecordingStatus
} from '../../../store/slices/recordingSlice';
import type { PlayStatus } from '../../../types/playback/playbackbody';
import type { PlaybackVideoItem } from '../../../types/playback/playbackbody';
import {  Card, Empty, Typography, Tag, Spin, message } from 'antd';
import React from "react";
import { formatDuration } from '../../../utils/playback/playback';
import { v4 as uuidv4 } from 'uuid'; // 需安装：npm install uuid
import './index.css';

const { Text, Title } = Typography;

// 初始 Mock 数据


const PlaybackList: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedVideoIdProp, setSelectedVideoIdProp] = useState<string | null>(null);
  const [videoListProp, setVideoListProp] = useState<PlaybackVideoItem[]>(() => {
    // 从 localStorage 恢复录制的视频（可选：避免刷新丢失）
    const savedLocalVideos = localStorage.getItem('localRecordedVideos');
    if (savedLocalVideos) {
      try {
        const parsedVideos = JSON.parse(savedLocalVideos);
        // 为本地录制的视频重新创建 Blob URL
        return parsedVideos.map((video: any) => {
          if (video.isLocalRecord && video.url && video.url.startsWith('data:')) {
            try {
              // 从 Base64 数据创建 Blob
              const base64Data = video.url;
              const byteString = atob(base64Data.split(',')[1]);
              const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
              console.log('Restoring video from base64, MIME type:', mimeString);
              
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              
              // 创建Blob时使用正确的MIME类型
              const blob = new Blob([ab], { type: mimeString });
              console.log('Created blob from base64, size:', blob.size);
              
              const newBlobUrl = URL.createObjectURL(blob);
              return {
                ...video,
                url: newBlobUrl,
              };
            } catch (error) {
              console.error('Failed to restore video from base64:', error);
              // 恢复失败时，移除该视频项
              return null;
            }
          }
          return video;
        }).filter((video: any) => video !== null); // 过滤掉恢复失败的视频
      } catch (error) {
        console.error('Failed to parse localStorage videos:', error);
        // 解析失败时，清空localStorage
        localStorage.removeItem('localRecordedVideos');
      }
    }
    return [];
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
      // 1. 生成视频项（默认标题 + 时间戳命名）
      const now = new Date();
      const createTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      // 2. 检查是否已经添加了当前录制的视频（通过时间戳和时长双重检查）
      // 避免同一录制生成多个视频项
      const isDuplicate = videoListProp.some(item => 
        item.isLocalRecord && 
        Math.abs(new Date(item.createTime || 0).getTime() - now.getTime()) < 1000 && // 1秒内的录制视为同一个
        item.duration === Math.floor(lastRecordingDuration / 1000) // 时长相同
      );
      
      if (!isDuplicate) {
        // 3. 生成 Blob URL（可直接在 video 中播放）
        const blobUrl = URL.createObjectURL(videoBlob);
        const newVideoItem: PlaybackVideoItem = {
          id: uuidv4(), // 唯一 ID
          title: `本地录屏_${createTime}`,
          url: blobUrl,
          duration: Math.floor(lastRecordingDuration / 1000), // 转为秒（适配原有 formatDuration）
          createTime,
          isLocalRecord: true, // 标记为本地录制视频
        };

        const newVideoList = [newVideoItem, ...videoListProp]; // 新视频置顶
        setVideoListProp(newVideoList);
        // 4. 将视频转换为Base64保存到 localStorage（持久化）
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          // 保存视频数据到localStorage，不包含临时的blob URL
          const videoDataForStorage = newVideoList.map(video => ({
            ...video,
            url: video.isLocalRecord && video.id === newVideoItem.id ? base64Data : video.url, // 只更新当前新录制视频的base64数据
          }));
          localStorage.setItem('localRecordedVideos', JSON.stringify(videoDataForStorage));
        };
        reader.readAsDataURL(videoBlob);
        // 5. 缓存 blob URL 用于后续释放
        blobUrlRef.current[newVideoItem.id] = blobUrl;
        // 6. 自动选中新录制的视频
        setSelectedVideoIdProp(newVideoItem.id);
        dispatch(setPlaybackUrl(newVideoItem.url));
        // 7. 同时设置录制的时长到Redux中，确保进度条能正常显示时长
        const validDuration = isNaN(newVideoItem.duration) || !isFinite(newVideoItem.duration) ? 0 : newVideoItem.duration;
        dispatch(setDuration(validDuration));
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
    // 切换视频时将列表中的时间传入进度条的slidermax中，确保不是NaN或Infinity
    const validDuration = isNaN(video.duration) || !isFinite(video.duration) ? 0 : video.duration;
    dispatch(setDuration(validDuration));
    // 模拟加载完成（可通过 video 标签的 canplay 事件优化）
    setTimeout(() => setVideoLoading(false), 800);
    message.success(`已切换至：${video.title}`);
  };

  // 初始化：选中第一个视频，特别是当播放列表只有一个视频时
  useEffect(() => {
    // 当列表有视频且没有选中的视频时，默认选中第一个
    if (videoListProp.length > 0 && !selectedVideoIdProp) {
      setSelectedVideoIdProp(videoListProp[0].id);
      dispatch(setPlaybackUrl(videoListProp[0].url));
      // 初始化时也将第一个视频的时长传入Redux状态，确保不是NaN或Infinity
      const validDuration = isNaN(videoListProp[0].duration) || !isFinite(videoListProp[0].duration) ? 0 : videoListProp[0].duration;
      dispatch(setDuration(validDuration));
    }
    // 特别处理：当播放列表只有一个视频时，确保它被选中
    else if (videoListProp.length === 1) {
      // 无论之前是否有选中的视频，都选中这唯一的视频
      setSelectedVideoIdProp(videoListProp[0].id);
      dispatch(setPlaybackUrl(videoListProp[0].url));
      const validDuration = isNaN(videoListProp[0].duration) || !isFinite(videoListProp[0].duration) ? 0 : videoListProp[0].duration;
      dispatch(setDuration(validDuration));
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
    localStorage.setItem('localRecordedVideos', JSON.stringify([]));
    // 更新组件状态，清空视频列表
    setVideoListProp([]);
    // 重置选中视频状态
    setSelectedVideoIdProp(null);
    // 重置播放URL
    dispatch(setPlaybackUrl(''));
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