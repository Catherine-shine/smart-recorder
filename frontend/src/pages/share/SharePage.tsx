import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message, Spin, Button, Slider, Switch, Typography, Space } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  MutedOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BulbOutlined,
  BulbFilled
} from '@ant-design/icons';
import { getRecordingDetail } from '../../api/recording';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setPlaybackUrl,
  setAudioUrl,
  setWebcamUrl,
  setDuration,
  setTrajectoryData,
  resetPlaybackState,
  setCurrentTime,
  setPlaybackStatus
} from '../../store/slices/playbackSlice';
import { toggleTheme } from '../../store/slices/layoutSlice';
import WebcamFloating from '../../components/playback/webcamFloating/webcamFloating';
import './index.css';

const { Title, Text } = Typography;

const SharePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const hashid = searchParams.get('hashid');
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();
  
  // 本地播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeLocal, setCurrentTimeLocal] = useState(0);
  const [durationLocal, setDurationLocal] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Redux state
  const { playbackUrl, webcamUrl, audioUrl, trajectoryData } = useAppSelector(state => state.playback);
  const { theme } = useAppSelector(state => state.layout);
  const isDarkMode = theme === 'dark';

  // 当playbackUrl变化时，重置时长状态
  useEffect(() => {
    if (playbackUrl) {
      // 重置时长状态，确保使用新视频的时长
      setDurationLocal(0);
      // 触发视频加载元数据
      const video = videoRef.current;
      if (video) {
        // 手动加载元数据，确保能获取到正确时长
        video.load();
      }
    }
  }, [playbackUrl]);

  // 加载录制数据
  useEffect(() => {
    const loadRecording = async () => {
      if (!hashid) {
        message.error('无效的分享链接');
        setLoading(false);
        return;
      }

      try {
        dispatch(resetPlaybackState());
        const recordingData = await getRecordingDetail(hashid);
        
        if (recordingData.screenRecordingUrl) {
          dispatch(setPlaybackUrl(recordingData.screenRecordingUrl));
        }
        if (recordingData.audioUrl) {
          dispatch(setAudioUrl(recordingData.audioUrl));
        }
        if (recordingData.webcamRecordingUrl) {
          dispatch(setWebcamUrl(recordingData.webcamRecordingUrl));
        }
        
        if (recordingData.duration && recordingData.duration > 0) {
          dispatch(setDuration(recordingData.duration));
          setDurationLocal(recordingData.duration);
        }

        if (recordingData.trajectory) {
          try {
            const trajectoryData = typeof recordingData.trajectory === 'string' 
              ? JSON.parse(recordingData.trajectory) 
              : recordingData.trajectory;
            dispatch(setTrajectoryData(trajectoryData));
          } catch (error) {
            console.error('Failed to parse trajectory data:', error);
          }
        }

      } catch (error) {
        console.error('Failed to load recording:', error);
        message.error('加载录制内容失败');
      } finally {
        setLoading(false);
      }
    };

    loadRecording();
    
    return () => {
      dispatch(resetPlaybackState());
    };
  }, [hashid, dispatch]);

  // 根据轨迹数据控制摄像头和音频状态
  const controlMediaByTimestamps = (time: number) => {
    const timeMs = time * 1000;
    
    // 处理摄像头状态
    const cameraChanges = trajectoryData?.cameraStateChanges || [];
    let cameraEnabled = false;
    for (let i = cameraChanges.length - 1; i >= 0; i--) {
      if (cameraChanges[i].timestamp <= timeMs) {
        cameraEnabled = cameraChanges[i].isEnabled;
        break;
      }
    }
    setWebcamActive(cameraEnabled);
    
    // 处理音频状态
    const audioChanges = trajectoryData?.audioStateChanges || [];
    let audioEnabled = false;
    for (let i = audioChanges.length - 1; i >= 0; i--) {
      if (audioChanges[i].timestamp <= timeMs) {
        audioEnabled = audioChanges[i].isEnabled;
        break;
      }
    }
    setAudioActive(audioEnabled);
  };

  // 播放/暂停
  const togglePlay = () => {
    const video = videoRef.current;
    const webcam = webcamRef.current;
    const audio = audioRef.current;
    
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
      webcam?.pause();
      audio?.pause();
      setIsPlaying(false);
    } else {
      video.play();
      if (webcamActive && webcam) webcam.play();
      if (audioActive && audio) audio.play();
      setIsPlaying(true);
    }
  };

  // 时间更新
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTimeLocal(video.currentTime);
      dispatch(setCurrentTime(video.currentTime));
      controlMediaByTimestamps(video.currentTime);
      
      // 同步摄像头和音频时间
      if (webcamRef.current) {
        webcamRef.current.currentTime = video.currentTime;
      }
      if (audioRef.current) {
        audioRef.current.currentTime = video.currentTime;
      }
    }
  };

  // 进度条拖动
  const handleSeek = (value: number) => {
    const video = videoRef.current;
    const webcam = webcamRef.current;
    const audio = audioRef.current;
    
    if (video) {
      video.currentTime = value;
      if (webcam) webcam.currentTime = value;
      if (audio) audio.currentTime = value;
      setCurrentTimeLocal(value);
    }
  };

  // 音量控制
  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
    if (value === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  // 静音切换
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // 视频加载完成
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      // 使用视频实际时长更新本地状态和Redux状态
      const actualDuration = video.duration;
      setDurationLocal(actualDuration);
      dispatch(setDuration(actualDuration));
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className={`share-loading ${isDarkMode ? 'dark' : ''}`}>
        <Spin size="large" tip="正在加载分享内容..." />
      </div>
    );
  }

  if (!hashid) {
    return <div className={`share-error ${isDarkMode ? 'dark' : ''}`}>无效的分享链接</div>;
  }

  return (
    <div className={`share-page ${isDarkMode ? 'dark' : ''}`} ref={containerRef}>
      {/* 顶部横幅 */}
      <header className="share-header">
        <Space align="center" size="large">
          {/* Logo */}
          <div className="share-logo">
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>VS</Text>
          </div>
          <Title level={5} className="share-title">
            Visionaries智能录课工具
          </Title>
        </Space>

        <Space align="center" size="middle">
          {/* 主题切换开关 */}
          <div className="share-theme-switch" onClick={() => dispatch(toggleTheme())}>
            <Switch
              checked={isDarkMode}
              onChange={(_, e) => {
                e?.stopPropagation();
                dispatch(toggleTheme());
              }}
              checkedChildren={<BulbFilled style={{ color: '#fcd34d', fontSize: 16 }} />}
              unCheckedChildren={<BulbOutlined style={{ color: '#64748b', fontSize: 16 }} />}
              size="default"
            />
          </div>
        </Space>
      </header>

      <div className="share-main-container">
        {/* 视频播放器区域 */}
        <div className="share-video-section">
          <div className="share-video-wrapper">
            <video
              ref={videoRef}
              className="share-main-video"
              src={playbackUrl as string}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedMetadata} // 增加此事件监听，确保能获取到正确时长
              onCanPlayThrough={handleLoadedMetadata} // 增加此事件监听，确保视频可以流畅播放时获取时长
              onEnded={() => {
                setIsPlaying(false);
                // 视频播放结束时，将当前时间设置为视频时长，确保进度条显示正确
                const video = videoRef.current;
                if (video) {
                  setCurrentTimeLocal(video.duration);
                }
              }}
              onClick={togglePlay}
              preload="metadata" // 预加载元数据，有助于更快获取时长
            />
            
            {/* 播放/暂停覆盖按钮 */}
            {!isPlaying && (
              <div className="share-play-overlay" onClick={togglePlay}>
                <PlayCircleOutlined className="share-play-icon" />
              </div>
            )}
          </div>
          
          {/* 控制栏 */}
          <div className="share-controls">
            <Button
              type="text"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={togglePlay}
              className="share-play-btn"
            />
            
            <span className="share-time">{formatTime(currentTimeLocal)}</span>
            
            <Slider
              className="share-progress"
              min={0}
              max={durationLocal}
              step={0.1}
              value={currentTimeLocal}
              onChange={handleSeek}
              tooltip={{ formatter: (val) => formatTime(val || 0) }}
            />
            
            <span className="share-time">{formatTime(durationLocal)}</span>
            
            <Button
              type="text"
              icon={isMuted ? <MutedOutlined /> : <SoundOutlined />}
              onClick={toggleMute}
            />
            
            <Slider
              className="share-volume"
              min={0}
              max={1}
              step={0.1}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
            />
            
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
            />
          </div>
        </div>
      </div>
      
      {/* 悬浮摄像头组件 */}
      <WebcamFloating
        webcamRef={webcamRef}
        webcamActive={webcamActive}
        visible={true}
        onLoadedMetadata={() => console.log('Webcam loaded metadata')}
        onError={() => console.error('Webcam error')}
      />
      
      {/* 音频元素（隐藏） */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          muted={isMuted || !audioActive}
        />
      )}
    </div>
  );
};

export default SharePage;
