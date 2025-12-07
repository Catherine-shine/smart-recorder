
import type { RootState } from '../../../store';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { setPlaybackUrl, setDuration, setRecordList, resetPlaybackState, setCurrentVideo } from '../../../store/slices/playbackSlice';
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
import type { PlaybackVideoItem } from '../../../types/playback/playbackbody';
import {  Card, Empty, Typography, Tag, Spin, message } from 'antd';
import React from "react";
import { formatDuration } from '../../../utils/playback/playback';
import { v4 as uuidv4 } from 'uuid'; // 需安装：npm install uuid
import { uploadRecording } from '../../../api/recording';
import './index.css';

const { Text, Title } = Typography;

// 初始 Mock 数据


const PlaybackList: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedVideoIdProp, setSelectedVideoIdProp] = useState<string | null>(null);
  // 本地视频列表
  const [localVideoList, setLocalVideoList] = useState<PlaybackVideoItem[]>(() => {
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
                hashid: video.hashid || null, // 确保hashid字段存在
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
  // 视频列表（只包含本地视频）
  const videoListProp = localVideoList;

  // 从 Redux 获取录制相关数据
  const collectedData = useSelector(selectCollectedData); // 录制的视频 Blob
  const videoBlob = collectedData.videoBlob;
  const lastRecordingDuration = useSelector(selectLastRecordingDuration); // 录制时长（毫秒）
  const recordingStatus = useSelector(selectRecordingStatus); // 录制状态
  const { playbackUrl } = useSelector((state: RootState) => state.playback);

  // 存储已生成的 blob URL（用于组件卸载时释放内存）
  const blobUrlRef = useRef<Record<string, string>>({});

  // 添加一个状态来跟踪是否正在上传
  const [isUploading, setIsUploading] = useState(false);
  // 添加一个时间戳来记录上次上传时间
  const [lastUploadTime, setLastUploadTime] = useState(0);

  // 核心逻辑：录制结束后，将视频添加到播放列表
  useEffect(() => {
    // 定义异步函数来处理视频上传
    const handleVideoRecording = async () => {
      // 触发条件：录制状态变为未录制 + 有视频 Blob + 有录制时长 + 不在上传中
      if (
        recordingStatus === RECORDING_STATUS.NOT_RECORDING &&
        videoBlob && 
        lastRecordingDuration !== null &&
        !isUploading
      ) {
        try {
          // 检查距离上次上传是否过短（避免短时间内多次上传）
          const now = Date.now();
          const nowDate = new Date(now);
          if (now - lastUploadTime < 5000) { // 5秒内不允许重复上传
            console.log('上传过于频繁，请稍后再试');
            return;
          }
          
          setIsUploading(true);
          setLastUploadTime(now);
          
          // 1. 生成视频项（默认标题 + 时间戳命名）
          const createTime = `${nowDate.getFullYear()}-${(nowDate.getMonth() + 1).toString().padStart(2, '0')}-${nowDate.getDate().toString().padStart(2, '0')} ${nowDate.getHours().toString().padStart(2, '0')}:${nowDate.getMinutes().toString().padStart(2, '0')}:${nowDate.getSeconds().toString().padStart(2, '0')}`;
          
          // 2. 检查是否已经添加了当前录制的视频（通过检查videoBlob是否已存在于列表中）
          // 避免同一录制生成多个视频项
          const blobUrlToCheck = URL.createObjectURL(videoBlob);
          const isDuplicate = localVideoList.some(item => 
            item.isLocalRecord && item.url === blobUrlToCheck
          );
          URL.revokeObjectURL(blobUrlToCheck); // 释放临时URL
          
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
              hashid: undefined, // 后端返回的hashid，初始为undefined
            };

            // 4. 上传视频到后端（带重试机制）
            try {
              // 构建上传表单数据
              const trajectoryData = JSON.stringify({
                whiteboardData: collectedData.whiteboardData,
                mouseData: collectedData.mouseData
              });

              // 上传重试机制
              const maxRetries = 3;
              let retryCount = 0;
              let uploadSuccess = false;

              while (retryCount < maxRetries && !uploadSuccess) {
                try {
                  const uploadResponse = await uploadRecording({
                    audio: new File([''], 'audio.webm', { type: 'audio/webm' }),
                    trajectory: new File([trajectoryData], 'trajectory.json', { type: 'application/json' }),
                    screen_recording: new File([videoBlob], 'screen_recording.webm', { type: videoBlob.type })
                  });

                  // 更新视频项，添加后端hashid
                  newVideoItem.hashid = uploadResponse.hashid;
                  message.success('视频已上传到服务器！');
                  uploadSuccess = true;
                } catch (error) {
                  retryCount++;
                  if (retryCount >= maxRetries) {
                    throw error; // 达到最大重试次数，抛出错误
                  }
                  console.warn(`上传失败，正在重试（${retryCount}/${maxRetries}）...`);
                  // 等待一段时间后重试
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
              }
            } catch (error) {
              console.error('上传视频到后端失败:', error);
              message.error('上传视频到服务器失败，将使用本地下载');
            }

            // 5. 更新本地视频列表（使用函数式更新避免闭包问题）
            setLocalVideoList(prevList => {
              // 检查视频是否已经存在（通过检查videoBlob内容）
              // 我们可以通过比较视频的创建时间和时长来判断是否为同一个视频
              const existingVideoIndex = prevList.findIndex(item => 
                item.isLocalRecord && 
                Math.abs(new Date(item.createTime || 0).getTime() - now) < 1000 && // 1秒内的视频视为同一个（now已经是时间戳）
                item.duration === Math.floor(lastRecordingDuration / 1000)
              );
              
              if (existingVideoIndex >= 0) {
                // 如果视频已存在，直接返回原列表
                return prevList;
              }
              
              const newLocalVideoList = [newVideoItem, ...prevList]; // 新视频置顶
              
              // 6. 将视频转换为Base64保存到 localStorage（持久化）
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = reader.result as string;
                // 保存视频数据到localStorage，不包含临时的blob URL
                const videoDataForStorage = newLocalVideoList.map(video => ({
                  ...video,
                  url: video.isLocalRecord && video.id === newVideoItem.id ? base64Data : video.url, // 只更新当前新录制视频的base64数据
                }));
                localStorage.setItem('localRecordedVideos', JSON.stringify(videoDataForStorage));
              };
              reader.readAsDataURL(videoBlob);
              
              return newLocalVideoList;
            });
            
            // 7. 缓存 blob URL 用于后续释放
            blobUrlRef.current[newVideoItem.id] = blobUrl;
            // 8. 自动选中新录制的视频
            setSelectedVideoIdProp(newVideoItem.id);
            dispatch(setPlaybackUrl(newVideoItem.url));
            dispatch(setCurrentVideo(newVideoItem)); // 将当前视频信息存储到Redux中
            // 9. 同时设置录制的时长到Redux中，确保进度条能正常显示时长
            const validDuration = isNaN(newVideoItem.duration) || !isFinite(newVideoItem.duration) ? 0 : newVideoItem.duration;
            dispatch(setDuration(validDuration));
            
            // 10. 重置录制状态，清除videoBlob和lastRecordingDuration，防止重复添加视频
            // 注意：我们只清除数据，不改变录制状态
            dispatch(setLastRecordingDuration(null));
            dispatch(collectData({ type: 'video', data: null }));
            
            message.success('新录制的视频已添加到播放列表！');
          }
        } finally {
          // 无论成功失败，都设置上传状态为false
          setIsUploading(false);
        }
      }
    };

    // 调用异步函数处理视频录制
    handleVideoRecording();
  }, [recordingStatus, videoBlob, lastRecordingDuration, dispatch, isUploading, lastUploadTime]); // 更新依赖项

  // 处理视频选择逻辑
  const handleVideoSelect = (video: PlaybackVideoItem) => {
    setSelectedVideoIdProp(video.id);
    setPlayStatus('stopped');
    setVideoLoading(true);
    dispatch(setPlaybackUrl(video.url));
    dispatch(setCurrentVideo(video)); // 将当前视频信息存储到Redux中
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
      dispatch(setCurrentVideo(videoListProp[0])); // 将当前视频信息存储到Redux中
      // 初始化时也将第一个视频的时长传入Redux状态，确保不是NaN或Infinity
      const validDuration = isNaN(videoListProp[0].duration) || !isFinite(videoListProp[0].duration) ? 0 : videoListProp[0].duration;
      dispatch(setDuration(validDuration));
    }
    // 特别处理：当播放列表只有一个视频时，确保它被选中
    else if (videoListProp.length === 1) {
      // 无论之前是否有选中的视频，都选中这唯一的视频
      setSelectedVideoIdProp(videoListProp[0].id);
      dispatch(setPlaybackUrl(videoListProp[0].url));
      dispatch(setCurrentVideo(videoListProp[0])); // 将当前视频信息存储到Redux中
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

  // 删除单个视频
  const deleteVideo = (videoId: string) => {
    // 找到要删除的视频
    const videoToDelete = localVideoList.find(video => video.id === videoId);
    if (!videoToDelete) return;

    // 1. 释放该视频的 blob URL
    if (blobUrlRef.current[videoId]) {
      URL.revokeObjectURL(blobUrlRef.current[videoId]);
      delete blobUrlRef.current[videoId];
    }

    // 2. 更新本地视频列表
    const updatedVideoList = localVideoList.filter(video => video.id !== videoId);
    setLocalVideoList(updatedVideoList);

    // 3. 更新localStorage
    // 转换为Base64格式存储（如果需要）
    const videosForStorage = updatedVideoList.map(video => {
      if (video.isLocalRecord && video.url && video.url.startsWith('blob:')) {
        // 这里不需要重新转换，因为localStorage中已经存储了Base64格式
        // 我们只需要保持原来的存储格式
        return video;
      }
      return video;
    });
    localStorage.setItem('localRecordedVideos', JSON.stringify(videosForStorage));

    // 4. 如果删除的是当前选中的视频，需要更新选中状态
    if (selectedVideoIdProp === videoId) {
      setSelectedVideoIdProp(null);
      dispatch(setPlaybackUrl(''));
      dispatch(resetPlaybackState());
    }

    // 5. 如果还有其他视频，默认选中第一个
    if (updatedVideoList.length > 0 && !selectedVideoIdProp) {
      setSelectedVideoIdProp(updatedVideoList[0].id);
      dispatch(setPlaybackUrl(updatedVideoList[0].url));
      dispatch(setCurrentVideo(updatedVideoList[0]));
      const validDuration = isNaN(updatedVideoList[0].duration) || !isFinite(updatedVideoList[0].duration) ? 0 : updatedVideoList[0].duration;
      dispatch(setDuration(validDuration));
    }

    message.success('视频已删除！');
  };

  // 可选：清空录制视频列表（可暴露为按钮点击事件）
  const clearLocalVideos = () => {
    // 释放所有 blob URL
    localVideoList
      .forEach(item => {
        if (blobUrlRef.current[item.id]) {
          URL.revokeObjectURL(blobUrlRef.current[item.id]);
          delete blobUrlRef.current[item.id];
        }
      });
    // 保留 Mock 数据，清空录制视频
    localStorage.setItem('localRecordedVideos', JSON.stringify([]));
    // 更新组件状态，清空视频列表
    setLocalVideoList([]);
    // 重置选中视频状态
    setSelectedVideoIdProp(null);
    // 重置播放URL
    dispatch(setPlaybackUrl(''));
    // 清空Redux中的录制列表
    dispatch(setRecordList([]));
    // 重置播放状态
    dispatch(resetPlaybackState());
    // 重置录制状态，清除videoBlob和lastRecordingDuration，防止清空后重新添加视频
    dispatch(resetRecordingState());
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
              >
                <div 
                  className="list-item-content"
                  onClick={() => handleVideoSelect(video)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* 视频标题：本地录制视频标记 */}
                  <Text ellipsis className="video-title">
                    {video.isLocalRecord ? `🟢 ${video.title}` : `🔵 ${video.title}`}
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
                {/* 删除按钮 */}
                <div 
                  className="delete-video-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡，避免触发视频选择
                    deleteVideo(video.id);
                  }}
                  style={{ 
                    cursor: 'pointer', 
                    color: '#ff4d4f',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  删除
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