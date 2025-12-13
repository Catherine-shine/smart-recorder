
import type { RootState } from '../../../store';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { setPlaybackUrl, setDuration, setRecordList, resetPlaybackState, setCurrentVideo, setWebcamUrl, setAudioUrl } from '../../../store/slices/playbackSlice';
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
import { uploadRecording, getRecordingList, clearAllRecordings, deleteRecording, getRecordingDetail, downloadRecordingScreen, downloadRecordingWebcam, downloadRecordingAudio } from '../../../api/recording';

import './index.css';

const { Text, Title } = Typography;

// 初始 Mock 数据


const PlaybackList: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedVideoIdProp, setSelectedVideoIdProp] = useState<string | null>(null);
  // 视频列表（从后端获取）
  const [localVideoList, setLocalVideoList] = useState<PlaybackVideoItem[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  
  // 从后端获取视频列表
  useEffect(() => {
    const fetchVideoList = async () => {
      try {
        setListLoading(true);
        const response = await getRecordingList();
        
        // 将后端返回的录制列表转换为播放列表所需的格式
        const videoList = response?.map((item) => ({
          id: item.hashid,
          title: `录屏_${new Date(item.created_at).toLocaleString()}`,
          url: `/api/recordings/${item.hashid}/screen`, // 后端视频播放URL
          // 确保duration是数字类型，如果是字符串则转换为数字
          duration: typeof item.duration === 'string' ? parseFloat(item.duration) || 0 : item.duration || 0,
          createTime: new Date(item.created_at).toLocaleString(),
          isLocalRecord: false, // 标记为后端录制视频
          hashid: item.hashid,
        })) || [];
        
        setLocalVideoList(videoList);
      } catch (error) {
        console.error('获取后端视频列表失败:', error);
        messageApi.error('获取视频列表失败');
      } finally {
        setListLoading(false);
      }
    };
    
    fetchVideoList();
  }, []);
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

  // 定义Blob URL的类型，可以是单个URL字符串（本地视频）或包含视频和摄像头URL的对象（后端视频）
  type BlobUrlType = string | { video: string; webcam: string };
  
  
  // 存储已生成的 blob URL（用于组件卸载时释放内存）
  const blobUrlRef = useRef<Record<string, BlobUrlType>>({});

  // 组件卸载时释放所有Blob URL
  useEffect(() => {
    return () => {
      Object.values(blobUrlRef.current).forEach(blobUrl => {
        if (typeof blobUrl === 'string') {
          // 单个URL
          URL.revokeObjectURL(blobUrl);
        } else {
          // URL对象（包含video和webcam）
          if (blobUrl.video) URL.revokeObjectURL(blobUrl.video);
          if (blobUrl.webcam) URL.revokeObjectURL(blobUrl.webcam);
        }
      });
    };
  }, []);

  // 切换视频时释放前一个视频的Blob URL
  useEffect(() => {
    return () => {
      if (selectedVideoIdProp && blobUrlRef.current[selectedVideoIdProp]) {
        const blobUrl = blobUrlRef.current[selectedVideoIdProp];
        if (typeof blobUrl === 'string') {
          URL.revokeObjectURL(blobUrl);
        } else {
          if (blobUrl.video) URL.revokeObjectURL(blobUrl.video);
          if (blobUrl.webcam) URL.revokeObjectURL(blobUrl.webcam);
        }
        // 从引用中删除
        delete blobUrlRef.current[selectedVideoIdProp];
      }
    };
  }, [selectedVideoIdProp]);

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
                  messageApi.success('视频已上传到服务器！');
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
              messageApi.error('上传视频到服务器失败，将使用本地下载');
            }

            // 5. 重新从后端获取最新的视频列表
            const fetchUpdatedList = async () => {
              try {
                const response = await getRecordingList();
                
                // 将后端返回的录制列表转换为播放列表所需的格式
                const updatedVideoList = response.map((item) => ({
                  id: item.hashid,
                  title: `录屏_${new Date(item.created_at).toLocaleString()}`,
                  url: `/api/recordings/${item.hashid}/screen`, // 后端视频播放URL
                  duration: item.duration || 0,
                  createTime: new Date(item.created_at).toLocaleString(),
                  isLocalRecord: false, // 标记为后端录制视频
                  hashid: item.hashid,
                }));
                
                setLocalVideoList(updatedVideoList);
                
                // 自动选中最新录制的视频（列表中的第一个）
                if (updatedVideoList.length > 0) {
                  const latestVideo = updatedVideoList[0];
                  setSelectedVideoIdProp(latestVideo.id);
                  dispatch(setPlaybackUrl(latestVideo.url));
                  dispatch(setCurrentVideo(latestVideo));
                  const validDuration = isNaN(latestVideo.duration) || !isFinite(latestVideo.duration) ? 0 : latestVideo.duration;
                  dispatch(setDuration(validDuration));
                }
              } catch (error) {
                console.error('获取更新后的视频列表失败:', error);
              }
            };
            
            fetchUpdatedList();
            
            // 10. 重置录制状态，清除videoBlob和lastRecordingDuration，防止重复添加视频
            // 注意：我们只清除数据，不改变录制状态
            dispatch(setLastRecordingDuration(null));
            dispatch(collectData({ type: 'video', data: null }));
            
            messageApi.success('新录制的视频已添加到播放列表！');
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
  const handleVideoSelect = async (video: PlaybackVideoItem) => {
    console.log('=== 开始处理视频选择 ===', video.id, video.title);
    console.log('=== 选中的视频完整信息:', video);
    console.log('=== video.hashid:', video.hashid);
    const startTime = Date.now();
    
    setSelectedVideoIdProp(video.id);
    setPlayStatus('stopped');
    setVideoLoading(true);
    
    let loadingMessage: any = null;
    let mergingMessage: any = null;

    
    try {
      if (!video.isLocalRecord) {
        // 后端视频：获取视频和摄像头文件
        console.log('1. 开始处理后端视频，hashid:', video.hashid);
        loadingMessage = messageApi.loading('正在获取视频文件...', 0);
        
        // 提取hashid到局部变量，解决TypeScript类型问题
        const hashid = video.hashid;
        
        // 检查hashid是否存在，否则抛出错误
        if (!hashid) {
          throw new Error('视频没有hashid，无法获取视频文件');
        }
        
        // 并行下载视频、摄像头和音频文件
        console.log('2. 开始并行下载视频、摄像头和音频文件...');
        console.log('2.1 调用 downloadRecordingAudio:', hashid);
        const downloadStartTime = Date.now();
        
        const [screenResp, webcamResp, audioResp] = await Promise.all([
          downloadRecordingScreen(hashid),
          downloadRecordingWebcam(hashid),
          downloadRecordingAudio(hashid)
        ]);
        
        console.log('2.2 音频下载完成:', audioResp.type, audioResp.size);
        
        console.log('2. 视频、摄像头和音频文件下载完成，耗时:', Date.now() - downloadStartTime, 'ms');
        console.log('视频响应类型:', screenResp.type, '大小:', screenResp.size || '未知');
        console.log('摄像头响应类型:', webcamResp.type, '大小:', webcamResp.size || '未知');
        console.log('音频响应类型:', audioResp.type, '大小:', audioResp.size || '未知');
        
        // 验证下载的文件是否有效
        if (!screenResp || screenResp.size === 0) {
          throw new Error('下载的视频文件无效或为空');
        }
        
        if (!webcamResp || webcamResp.size === 0) {
          throw new Error('下载的摄像头文件无效或为空');
        }
        
        // 验证文件类型
        console.log('3. 验证文件类型...');
        if (!screenResp.type.startsWith('video/')) {
          console.warn('警告：视频文件类型不是视频格式，实际类型：', screenResp.type);
        }
        
        if (!webcamResp.type.startsWith('video/')) {
          console.warn('警告：摄像头文件类型不是视频格式，实际类型：', webcamResp.type);
        }
        
        // 更新加载状态
        if (loadingMessage) {
          loadingMessage(); // 关闭之前的消息
        }
        
        // 生成视频、摄像头和音频URL
        console.log('3. 生成视频、摄像头和音频URL...');
        const videoUrl = URL.createObjectURL(screenResp);
        const webcamUrl = URL.createObjectURL(webcamResp);
        const audioUrl = URL.createObjectURL(audioResp);
        
        // 释放之前可能存在的相同视频的Blob URL
        if (blobUrlRef.current[video.id]) {
          const oldBlobUrl = blobUrlRef.current[video.id];
          if (typeof oldBlobUrl === 'string') {
            URL.revokeObjectURL(oldBlobUrl);
          } else {
            if (oldBlobUrl.video) URL.revokeObjectURL(oldBlobUrl.video);
            if (oldBlobUrl.webcam) URL.revokeObjectURL(oldBlobUrl.webcam);
          }
        }
        
        // 存储Blob URL以便后续清理
        blobUrlRef.current[video.id] = {
          video: videoUrl,
          webcam: webcamUrl
        };
        
        // 更新播放URL和当前视频信息
        console.log('4. 更新视频、摄像头和音频URL和当前视频信息...');
        dispatch(setPlaybackUrl(videoUrl));
        dispatch(setWebcamUrl(webcamUrl));
        dispatch(setAudioUrl(audioUrl));
        dispatch(setCurrentVideo({
          ...video,
          url: videoUrl // 更新视频URL
        }));
        
        if (mergingMessage) {
          mergingMessage(); // 关闭合并消息
        }
        console.log('5. 视频处理完成，总耗时:', Date.now() - startTime, 'ms');
        messageApi.success('视频加载完成！');
      } else {
        // 本地视频：直接使用原URL
        console.log('本地视频：直接使用原URL', video.url);
        dispatch(setPlaybackUrl(video.url));
        dispatch(setCurrentVideo(video));
      }
      
      // 切换视频时将列表中的时间传入进度条的slidermax中
      dispatch(setDuration(video.duration));
      
      if (video.isLocalRecord) {
        messageApi.success(`已切换至：${video.title}`);
      }
    } catch (error) {
      console.error('处理视频选择失败:', error);
      console.error('错误详情:', error instanceof Error ? error.stack : error);
      
      // 确保关闭所有加载消息
      if (loadingMessage) {
        loadingMessage();
      }
      if (mergingMessage) {
        mergingMessage();
      }
      
      // 根据错误类型提供更具体的错误信息
      if (error instanceof Error) {
          if (error.message.includes('下载')) {
            messageApi.error('下载视频文件失败，请检查网络连接或服务器状态');
        } else if (error.message.includes('超时')) {
            messageApi.error('操作超时，请稍后重试');
        } else if (error.message.includes('无效') || error.message.includes('为空')) {
            messageApi.error('文件无效，请检查服务器文件是否完整');
        } else {
            messageApi.error('处理视频失败，请重试或联系管理员');
        }
      } else {
          messageApi.error('处理视频失败，请重试');
      }
      
      // 失败时使用原视频URL作为备选
      console.log('错误处理：使用原视频URL作为备选播放源');
      if (video.isLocalRecord) {
        // 本地视频可以直接使用原URL
        if (video.url && video.url !== '' && video.url !== 'about:blank') {
          dispatch(setPlaybackUrl(video.url));
        } else {
          console.error('本地视频URL无效，无法设置播放源');
          dispatch(setPlaybackUrl(''));
        }
      } else {
        // 后端视频需要确保URL是可以直接播放的
        // 对于失败情况，我们尝试直接使用API URL作为最后的备选
        // 注意：这可能仍然无法工作，因为API可能需要正确的响应类型
        if (video.url && video.url !== '' && video.url !== 'about:blank') {
          dispatch(setPlaybackUrl(video.url));
        } else {
          console.error('后端视频URL无效，无法设置播放源');
          dispatch(setPlaybackUrl(''));
        }
      }
      dispatch(setCurrentVideo(video));
    } finally {
      // 无论成功失败，都设置加载状态为false
      console.log('=== 视频选择处理结束 === 总耗时:', Date.now() - startTime, 'ms');
      setVideoLoading(false);
      // 关闭所有loading消息
      message.destroy();
    }
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
        if (typeof blobUrl === 'string') {
          // 本地视频：直接释放URL
          URL.revokeObjectURL(blobUrl);
        } else if (typeof blobUrl === 'object' && blobUrl !== null) {
          // 后端视频：分别释放视频和摄像头URL
          if (blobUrl.video) URL.revokeObjectURL(blobUrl.video);
          if (blobUrl.webcam) URL.revokeObjectURL(blobUrl.webcam);
        }
      });
      // 清除所有消息
      message.destroy();
    };
  }, []);

  // 删除单个视频
  const deleteVideo = async (videoId: string) => {
    // 找到要删除的视频
    const videoToDelete = localVideoList.find(video => video.id === videoId);
    if (!videoToDelete) return;

    try {
      // 1. 如果是后端视频，调用API删除
      if (!videoToDelete.isLocalRecord && videoToDelete.hashid) {
        await deleteRecording(videoToDelete.hashid);
      }

      // 2. 释放该视频的 blob URL（如果有的话）
      if (blobUrlRef.current[videoId]) {
        const blobUrl = blobUrlRef.current[videoId];
        if (typeof blobUrl === 'string') {
          // 本地视频：直接释放URL
          URL.revokeObjectURL(blobUrl);
        } else if (typeof blobUrl === 'object' && blobUrl !== null) {
          // 后端视频：分别释放视频和摄像头URL
          if (blobUrl.video) URL.revokeObjectURL(blobUrl.video);
          if (blobUrl.webcam) URL.revokeObjectURL(blobUrl.webcam);
        }
        delete blobUrlRef.current[videoId];
      }

      // 3. 更新本地视频列表
      const updatedVideoList = localVideoList.filter(video => video.id !== videoId);
      setLocalVideoList(updatedVideoList);

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

      messageApi.success('视频已删除！');
    } catch (error) {
      console.error('删除视频失败:', error);
      messageApi.error('删除视频失败');
    }
  };

  // 清空所有录制数据
  const clearLocalVideos = async () => {
    try {
      // 1. 调用后端API清空所有数据
      await clearAllRecordings();

      // 2. 释放所有 blob URL
      localVideoList
        .forEach(item => {
          if (blobUrlRef.current[item.id]) {
            const blobUrl = blobUrlRef.current[item.id];
            if (typeof blobUrl === 'string') {
              // 本地视频：直接释放URL
              URL.revokeObjectURL(blobUrl);
            } else if (typeof blobUrl === 'object' && blobUrl !== null) {
              // 后端视频：释放视频URL
              if (blobUrl.video) URL.revokeObjectURL(blobUrl.video);
              if (blobUrl.webcam) URL.revokeObjectURL(blobUrl.webcam);
            }
            delete blobUrlRef.current[item.id];
          }
        });

      // 3. 更新组件状态，清空视频列表
      setLocalVideoList([]);

      // 4. 重置选中视频状态
      setSelectedVideoIdProp(null);

      // 5. 重置播放URL
      dispatch(setPlaybackUrl(''));

      // 6. 清空Redux中的录制列表
      dispatch(setRecordList([]));

      // 7. 重置播放状态
      dispatch(resetPlaybackState());

      // 8. 重置录制状态，清除videoBlob和lastRecordingDuration，防止清空后重新添加视频
      dispatch(resetRecordingState());

      messageApi.success('已清空后端录制数据！');
    } catch (error) {
      console.error('清空数据失败:', error);
      messageApi.error('清空数据失败');
    }
  };

  return (
    <>
      {contextHolder}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5}>回放视频列表</Title>
            {/* 可选：添加清空后端录制视频按钮 */}
            <Text 
              type="secondary"
              onClick={clearLocalVideos}
              style={{ cursor: 'pointer' }}
            >
              清空后端录屏
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
                  onClick={() => {
                    console.log('=== 视频列表项被点击 ===', video.id, video.title);
                    console.log('=== 点击的视频完整信息:', video);
                    handleVideoSelect(video);
                  }}
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
    </>
  );
};

export default PlaybackList;