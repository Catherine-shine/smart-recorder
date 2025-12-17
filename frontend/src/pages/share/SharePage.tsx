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
import './index.css';

const { Title, Text } = Typography;

const SharePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const hashid = searchParams.get('hashid');
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();
  
  // 本地播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTimeLocal] = useState(0);
  const [duration, setDurationLocal] = useState(0);
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
      setDurationLocal(video.duration);
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
        {/* 左侧 3/4 - 视频播放器区域 */}
        <div className="share-video-section">
          <div className="share-video-wrapper">
            <video
              ref={videoRef}
              className="share-main-video"
              src={playbackUrl as string}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
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
            
            <span className="share-time">{formatTime(currentTime)}</span>
            
            <Slider
              className="share-progress"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              tooltip={{ formatter: (val) => formatTime(val || 0) }}
            />
            
            <span className="share-time">{formatTime(duration)}</span>
            
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
        
        {/* 右侧 1/4 - 摄像头区域 */}
        <div className="share-sidebar">
          <div className={`share-webcam-container ${webcamActive ? 'active' : 'inactive'}`}>
            {webcamUrl ? (
              <>
                <video
                  ref={webcamRef}
                  className="share-webcam-video"
                  src={webcamUrl}
                  muted
                />
                {!webcamActive && (
                  <div className="share-webcam-overlay">
                    <span>摄像头未开启</span>
                  </div>
                )}
              </>
            ) : (
              <div className="share-webcam-overlay">
                <span>无摄像头录制</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
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
