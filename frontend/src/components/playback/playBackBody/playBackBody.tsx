import type { RootState } from '../../../store';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCurrentTime,
  setDuration,
  setVolume,
  setIsMuted,
  setPlaybackRate,
  setIsPlayEnded,
  setVideoLoading,
  setPlaybackStatus,
} from '../../../store/slices/playbackSlice';
import PlayButton from './playButton/playButton';
import ProgressBar from './progressBar/progressBar';
import VolumeControl from './volumeControl/volumeControl';
import PlaybackRate from './playBackRate/playBackRate';
import { Card, Row, Col, Spin, Typography, message, Button,  } from 'antd';
import React, { useRef, useEffect, useState } from "react";
import { VideoCameraOutlined } from '@ant-design/icons';
import WebcamFloating from '../webcamFloating/webcamFloating';
import type{PlayBackBodyProps} from '../../../types/playback/playbackbody';
import './index.css';



const PlayBackBody: React.FC<PlayBackBodyProps> = ({ onTimeUpdate }) => {
  const dispatch = useDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const [showWebcam, setShowWebcam] = useState<boolean>(true);
  // 媒体加载状态追踪
  const [webcamReady, setWebcamReady] = useState<boolean>(false);
  const [audioReady, setAudioReady] = useState<boolean>(false);
  // 摄像头和麦克风的当前状态
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [audioActive, setAudioActive] = useState<boolean>(false);
  
  // 从 Redux 中获取所有状态
  const {
    playbackUrl,
    webcamUrl,
    audioUrl,
    status: playStatus,
    volume,
    isMuted,
    duration,
    playbackRate,
    isPlayEnded,
    videoLoading,
    currentVideo,
    mediaTimestamps,
  } = useSelector((state: RootState) => state.playback);

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // 组件挂载后，确保所有媒体元素都处于暂停状态
  useEffect(() => {
    // 立即执行，确保所有媒体元素在加载时就被暂停
    const pauseAllMedia = () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      if (webcamRef.current) {
        webcamRef.current.pause();
        webcamRef.current.currentTime = 0;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      console.log('All media elements paused on component mount');
    };
    
    // 立即执行一次
    pauseAllMedia();
    
    // 延迟100ms再执行一次，确保所有资源都已加载
    const timer = setTimeout(pauseAllMedia, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 优先使用Redux中保存的视频url
  const videoSrc = (typeof playbackUrl === 'object' && playbackUrl !== null ? playbackUrl.video : playbackUrl) || '';
  // 从Redux中获取麦克风音频url
  const audioSrc = audioUrl || '';
  
  // 确保videoSrc始终是有效的字符串
  const safeVideoSrc = videoSrc && videoSrc !== 'about:blank' ? videoSrc : '';

  // 根据时间戳控制摄像头和麦克风的播放状态
  const controlMediaByTimestamps = (currentTime: number) => {
    // 使用预处理的媒体时间戳标记
    const cameraChanges = mediaTimestamps.camera || [];
    const audioChanges = mediaTimestamps.audio || [];
    
    // 添加播放时间阈值（100ms），避免在播放初始时立即播放媒体
    const PLAY_THRESHOLD = 0.1; 
    
    console.log('controlMediaByTimestamps called:', {
      currentTime,
      currentTimeMs: currentTime * 1000,
      cameraChanges: cameraChanges.length,
      audioChanges: audioChanges.length,
      mediaTimestamps,
      isBelowThreshold: currentTime < PLAY_THRESHOLD
    });
    
    // 只在确实没有需要处理的状态变化时才返回
    // 如果只有一个媒体没有状态变化记录，仍然需要处理另一个媒体
    if ((cameraChanges.length === 0 && !webcamRef.current) && (audioChanges.length === 0 && !audioRef.current)) {
      console.log('No camera or audio changes available and no media elements');
      return;
    }
    
    // 转换currentTime为毫秒，与录制时的时间戳单位匹配
    const currentTimeMs = currentTime * 1000;
    
    // 检查摄像头状态
    let isCameraActive = false;
    let lastCameraChange = null;
    for (let i = cameraChanges.length - 1; i >= 0; i--) {
      const change = cameraChanges[i];
      if (change.timestamp <= currentTimeMs) {
        isCameraActive = change.isEnabled;
        lastCameraChange = change;
        break;
      }
    }
    
    // 检查麦克风状态
    let isAudioActive = false; // 没有状态变化记录时默认关闭
    let lastAudioChange = null;
    for (let i = audioChanges.length - 1; i >= 0; i--) {
      const change = audioChanges[i];
      if (change.timestamp <= currentTimeMs) {
        isAudioActive = change.isEnabled;
        lastAudioChange = change;
        break;
      }
    }
    
    console.log('Media state calculation:', {
      isCameraActive,
      isAudioActive,
      webcamActive,
      audioActive,
      playStatus,
      lastCameraChange,
      lastAudioChange
    });
    
    // 更新摄像头状态
    if (isCameraActive !== webcamActive) {
      console.log(`Camera state changing from ${webcamActive} to ${isCameraActive}`);
      setWebcamActive(isCameraActive);
    }
    
    // 更新麦克风状态
    if (isAudioActive !== audioActive) {
      console.log(`Audio state changing from ${audioActive} to ${isAudioActive}`);
      setAudioActive(isAudioActive);
    }
    
    // 只有当时间超过阈值且播放状态为playing时，才执行实际的播放/暂停操作
    if (currentTime >= PLAY_THRESHOLD && playStatus === 'playing') {
      // 控制音频播放
      const audio = audioRef.current;
      if (audio) {
        if (isAudioActive) {
          console.log('Playing audio (above threshold)');
          audio.play().catch(err => console.warn('Failed to play audio:', err));
        } else {
          console.log('Pausing audio');
          audio.pause();
        }
      }
      
      // 控制摄像头播放
      const webcam = webcamRef.current;
      if (webcam) {
        if (isCameraActive) {
          console.log('Playing webcam (above threshold)');
          webcam.play().catch(err => console.warn('Failed to play webcam:', err));
        } else {
          console.log('Pausing webcam');
          webcam.pause();
        }
      }
    } else if (currentTime < PLAY_THRESHOLD) {
      // 在阈值内，确保所有媒体都处于暂停状态
      // 控制音频
      const audio = audioRef.current;
      if (audio) {
        console.log('Pausing audio (below threshold)');
        audio.pause();
      }
      
      // 控制摄像头
      const webcam = webcamRef.current;
      if (webcam) {
        console.log('Pausing webcam (below threshold)');
        webcam.pause();
      }
    }
  };
  
  // 视频进度更新
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      const currentTime = video.currentTime;
      dispatch(setCurrentTime(currentTime));
      // 根据时间戳控制摄像头和麦克风的播放状态
      controlMediaByTimestamps(currentTime);
      // 调用外部传入的onTimeUpdate回调
      if (onTimeUpdate) {
        onTimeUpdate(currentTime);
      }
    }
  };
  
  // 视频元数据加载完成
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      console.log('Loaded metadata:', { duration: video.duration, readyState: video.readyState });
      
      // 优先使用Redux中已有的时长（来自后端），如果没有则从视频元素获取
      if (duration <= 0) {
        if (typeof video.duration === 'number' && !isNaN(video.duration) && video.duration > 0) {
          dispatch(setDuration(video.duration));
        } else {
          console.warn('Invalid video duration:', video.duration);
          // 如果时长无效，尝试通过loadeddata事件获取
          const handleLoadedData = () => {
            if (video && typeof video.duration === 'number' && !isNaN(video.duration) && video.duration > 0) {
              console.log('Got duration from loadeddata:', video.duration);
              dispatch(setDuration(video.duration));
              video.removeEventListener('loadeddata', handleLoadedData);
            }
          };
          video.addEventListener('loadeddata', handleLoadedData);
        }
      } else {
        console.log('Using duration from backend:', duration);
      }
      
      dispatch(setPlaybackStatus('stopped'));
      dispatch(setVideoLoading(false));
      
      // 根据轨迹数据设置摄像头和麦克风的初始状态
      const cameraChanges = mediaTimestamps.camera || [];
      const audioChanges = mediaTimestamps.audio || [];
      
      console.log('Setting initial media states:', {
        cameraChanges: cameraChanges.length,
        audioChanges: audioChanges.length
      });
      
      // 设置摄像头初始状态
      let initialCameraActive = false; // 没有状态变化记录时默认关闭
      if (cameraChanges.length > 0) {
        // 找到第一个时间戳之前的状态（如果第一个时间戳大于0，则初始状态是禁用的）
        if (cameraChanges[0].timestamp > 0) {
          initialCameraActive = false;
        } else {
          initialCameraActive = cameraChanges[0].isEnabled;
        }
      }
      
      // 设置音频初始状态
      let initialAudioActive = false; // 没有状态变化记录时默认关闭
      if (audioChanges.length > 0) {
        // 找到第一个时间戳之前的状态（如果第一个时间戳大于0，则初始状态是禁用的）
        if (audioChanges[0].timestamp > 0) {
          initialAudioActive = false;
        } else {
          initialAudioActive = audioChanges[0].isEnabled;
        }
      }
      
      console.log('Initial media states:', {
        initialCameraActive,
        initialAudioActive
      });
      
      setWebcamActive(initialCameraActive);
      setAudioActive(initialAudioActive);
      
      // 同步初始时间到摄像头和音频，并应用初始状态
      syncMediaTime(video.currentTime);
      
      // 立即调用一次controlMediaByTimestamps来确保状态正确应用
      controlMediaByTimestamps(video.currentTime);
    }
  };
  
  // 摄像头视频元数据加载完成
  const handleWebcamLoadedMetadata = () => {
    const webcam = webcamRef.current;
    const video = videoRef.current;
    if (webcam && video) {
      console.log('Webcam metadata loaded, readyState:', webcam.readyState);
      webcam.playbackRate = video.playbackRate;
      
      // 尝试同步时间，但不依赖此同步
      if (video.readyState >= 1) {
        syncMediaTime(video.currentTime);
      }
      
      // 标记摄像头已准备就绪
      setWebcamReady(true);
    }
  };
  
  // 音频元数据加载完成
  const handleAudioLoadedMetadata = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (audio && video) {
      console.log('Audio metadata loaded, readyState:', audio.readyState);
      audio.playbackRate = video.playbackRate;
      
      // 尝试同步时间，但不依赖此同步
      if (video.readyState >= 1) {
        syncMediaTime(video.currentTime);
      }
      
      // 标记音频已准备就绪
      setAudioReady(true);
    }
  };
  
  // 视频错误处理
  const handleVideoError = () => {
    messageApi.error('主视频加载失败，请检查视频源！');
    dispatch(setVideoLoading(false));
  };
  
  // 摄像头视频错误处理
  const handleWebcamError = () => {
    messageApi.warning('摄像头视频加载失败，将跳过摄像头播放！');
  };
  
  // 音频错误处理
  const handleAudioError = () => {
    messageApi.warning('音频加载失败，将跳过音频播放！');
  };
  
  // 同步所有媒体时间（带就绪检查和seeked确认）
  const syncMediaTime = (targetTime: number, callback?: () => void) => {
    const webcam = webcamRef.current;
    const audio = audioRef.current;
    const syncThreshold = 0.05; 
    let syncedCount = 0;
    const totalMedia = (webcam ? 1 : 0) + (audio ? 1 : 0);
    
    const onMediaSynced = () => {
      syncedCount++;
      if (syncedCount === totalMedia && callback) {
        callback();
      }
    };

    // 同步摄像头时间
    if (webcam && webcam.readyState >= 1) {
      // 检查是否可跳转
      if (webcam.seekable.length > 0) {
        const seekableStart = webcam.seekable.start(0);
        const seekableEnd = webcam.seekable.end(0);
        
        // 确保目标时间在可跳转范围内
        if (targetTime >= seekableStart && targetTime <= seekableEnd) {
          if (Math.abs(webcam.currentTime - targetTime) > syncThreshold) {
            try {
              // 监听seeked事件确认跳转完成
              const handleSeeked = () => {
                console.log('Webcam seeked to:', webcam.currentTime);
                webcam.removeEventListener('seeked', handleSeeked);
                // 同步后不自动播放，完全由controlMediaByTimestamps控制
                webcam.pause();
                onMediaSynced();
              };
              
              webcam.addEventListener('seeked', handleSeeked);
              webcam.currentTime = targetTime;
              
              // 设置超时保护
              setTimeout(() => {
                webcam.removeEventListener('seeked', handleSeeked);
                // 同步后不自动播放，完全由controlMediaByTimestamps控制
                webcam.pause();
                onMediaSynced();
              }, 300);
            } catch (e) {
              console.warn('Failed to sync webcam time:', e);
              onMediaSynced();
            }
          } else {
            onMediaSynced();
          }
        } else {
          console.warn('Webcam target time out of seekable range:', { targetTime, seekableStart, seekableEnd });
          onMediaSynced();
        }
      } else {
        console.warn('Webcam has no seekable range');
        onMediaSynced();
      }
    } else {
      onMediaSynced();
    }

    // 同步音频时间
    if (audio && audio.readyState >= 1) {
      // 检查是否可跳转
      if (audio.seekable.length > 0) {
        const seekableStart = audio.seekable.start(0);
        const seekableEnd = audio.seekable.end(0);
        
        // 确保目标时间在可跳转范围内
        if (targetTime >= seekableStart && targetTime <= seekableEnd) {
          if (Math.abs(audio.currentTime - targetTime) > syncThreshold) {
            try {
              // 监听seeked事件确认跳转完成
              const handleSeeked = () => {
                console.log('Audio seeked to:', audio.currentTime);
                audio.removeEventListener('seeked', handleSeeked);
                // 同步后不自动播放，完全由controlMediaByTimestamps控制
                audio.pause();
                onMediaSynced();
              };
              
              audio.addEventListener('seeked', handleSeeked);
              audio.currentTime = targetTime;
              
              // 设置超时保护
              setTimeout(() => {
                audio.removeEventListener('seeked', handleSeeked);
                // 同步后不自动播放，完全由controlMediaByTimestamps控制
                audio.pause();
                onMediaSynced();
              }, 300);
            } catch (e) {
              console.warn('Failed to sync audio time:', e);
              onMediaSynced();
            }
          } else {
            onMediaSynced();
          }
        } else {
          console.warn('Audio target time out of seekable range:', { targetTime, seekableStart, seekableEnd });
          onMediaSynced();
        }
      } else {
        console.warn('Audio has no seekable range');
        onMediaSynced();
      }
    } else {
      onMediaSynced();
    }
  };
  
  // 倍速变更
  const handleRateChange = (rate: number) => {
    dispatch(setPlaybackRate(rate));
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    if (webcamRef.current) {
      webcamRef.current.playbackRate = rate;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };
  
  // 音量更新
  const handleVolumeUpdate = (newVolume: number) => {
    dispatch(setVolume(newVolume));
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };
  
  // 静音切换
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    dispatch(setIsMuted(newMutedState));
    
    if (videoRef.current) {
      videoRef.current.volume = newMutedState ? 0 : volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume;
    }
  };
  
  // 进度条变更
  const handleProgressChange = (newTime: number) => {
    const video = videoRef.current;
    
    if (video) {
      video.currentTime = newTime;
    }
    
    // 同步所有媒体时间
    syncMediaTime(newTime);
    dispatch(setCurrentTime(newTime));
  };
  
  // 播放结束处理
  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      syncMediaTime(0);
      dispatch(setCurrentTime(0));
      dispatch(setPlaybackStatus('stopped'));
      dispatch(setIsPlayEnded(true));
      messageApi.success('视频播放结束！');
    }
  };
  
  // 播放操作 - 重新设计的同步播放逻辑
  const handlePlay = () => {
    const video = videoRef.current;
    const webcam = webcamRef.current;
    const audio = audioRef.current;
    
    if (!video) {
      messageApi.warning('视频播放器尚未加载完成，请稍候！');
      return;
    }
    
    // 验证视频源是否有效
    if (!safeVideoSrc || safeVideoSrc === 'about:blank') {
      messageApi.error('视频源无效，请重新选择视频！');
      return;
    }
    
    // 确保效的时长
    if (isNaN(video.duration) || video.duration <= 0) {
      console.log('Attempting to get duration before play:', video.duration);
      // 如果没有有效的时长，尝试再次获取
      if (video.readyState >= 1) {
        // 如果视频已经有一些元数据，尝试获取时长
        if (!isNaN(video.duration) && video.duration > 0) {
          dispatch(setDuration(video.duration));
        } else {
          messageApi.warning('视频时长信息正在加载中，请稍候再试！');
        }
      } else {
        messageApi.warning('视频尚未完全加载，请稍候再试！');
        return;
      }
    }
    
    // 播放主视频
    video.play()
      .then(() => {
        console.log('Main video playing, readyState:', video.readyState);
        
        // 强制同步所有媒体时间，但不立即播放摄像头和麦克风
        syncMediaTime(video.currentTime, () => {
          console.log('All media synced, starting playback of other media');
          
          // 准备摄像头视频（如果可用）但不播放
          const webcamPromise = webcam && webcam.src && webcam.src !== 'about:blank' && webcam.src !== '' 
            ? new Promise<void>((resolve) => {
                // 确保摄像头已准备就绪
                const checkWebcamReady = () => {
                  if (webcam.readyState >= 1) {
                    console.log('Webcam ready for playback, readyState:', webcam.readyState);
                    // 摄像头准备好但不播放，等待时间戳触发
                    webcam.pause();
                    resolve();
                  } else {
                    // 等待摄像头就绪
                    console.log('Waiting for webcam to be ready, readyState:', webcam.readyState);
                    setTimeout(checkWebcamReady, 50);
                  }
                };
                
                checkWebcamReady();
              })
            : Promise.resolve();
          
          // 准备音频（如果可用）但不播放
          const audioPromise = audio && audio.src && audio.src !== 'about:blank' && audio.src !== ''
            ? new Promise<void>((resolve) => {
                // 确保音频已准备就绪
                const checkAudioReady = () => {
                  if (audio.readyState >= 1) {
                    console.log('Audio ready for playback, readyState:', audio.readyState);
                    // 音频准备好但不播放，等待时间戳触发
                    audio.pause();
                    resolve();
                  } else {
                    // 等待音频就绪
                    console.log('Waiting for audio to be ready, readyState:', audio.readyState);
                    setTimeout(checkAudioReady, 50);
                  }
                };
                
                checkAudioReady();
              })
            : Promise.resolve();
          
          // 等待所有媒体准备完成
          return Promise.all([webcamPromise, audioPromise]);
        });
        
        return Promise.resolve();
      })
      .then(() => {
        // 设置初始的摄像头和麦克风状态
        const video = videoRef.current;
        if (video) {
          controlMediaByTimestamps(video.currentTime);
        }
        
        dispatch(setPlaybackStatus('playing'));
        dispatch(setIsPlayEnded(false));
      })
      .catch((err) => {
        console.error('视频播放失败：', err);
        if (err.name === 'NotAllowedError') {
          messageApi.error('播放失败：浏览器禁止自动播放视频，请手动点击播放按钮并确保是首次交互！');
        } else if (err.name === 'AbortError') {
          messageApi.error('视频加载被中断，请检查网络或视频源！');
        } else if (err.name === 'NotSupportedError') {
          messageApi.error('播放失败：视频格式不被支持或源无效！');
        } else {
          messageApi.error('播放失败，请检查视频源或浏览器权限！');
        }
        dispatch(setPlaybackStatus('stopped'));
      });
  };
  
  // 暂停操作
  const handlePause = () => {
    const video = videoRef.current;
    const webcam = webcamRef.current;
    const audio = audioRef.current;
    
    if (video) {
      video.pause();
    }
    if (webcam) {
      webcam.pause();
    }
    if (audio) {
      audio.pause();
    }
    
    dispatch(setPlaybackStatus('paused'));
  };
  
  // 停止操作
  const handleStop = () => {
    const video = videoRef.current;
    const webcam = webcamRef.current;
    const audio = audioRef.current;
    
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    if (webcam) {
      webcam.pause();
      webcam.currentTime = 0;
    }
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    
    dispatch(setCurrentTime(0));
    dispatch(setPlaybackStatus('stopped'));
    dispatch(setIsPlayEnded(true));
  };
  
  // 主视频源和属性管理
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // 先暂停并清空原有源
    video.pause();
    video.src = '';
    
    // 设置播放速率和音量
    video.playbackRate = playbackRate;
    video.volume = isMuted ? 0 : volume;
    
    // 视频源变化时重新加载
    if (safeVideoSrc && safeVideoSrc !== 'about:blank') {
      console.log('Loading new video source:', safeVideoSrc);
      dispatch(setVideoLoading(true));
      video.src = safeVideoSrc;
      
      // 添加loadeddata事件监听，作为loadedmetadata的补充
      const handleLoadedData = () => {
        if (video && !isNaN(video.duration) && video.duration > 0) {
          // 优先使用后端返回的时长，如果后端返回的时长无效，再使用视频文件的时长
          const backendDuration = currentVideo?.duration;
          if (typeof backendDuration === 'number' && !isNaN(backendDuration) && isFinite(backendDuration) && backendDuration > 0) {
            console.log('Using backend returned duration:', backendDuration);
            // 不更新，保持后端返回的时长
          } else {
            console.log('Got duration from loadeddata:', video.duration);
            dispatch(setDuration(video.duration));
          }
        }
      };
      
      // 添加canplaythrough事件监听，确保视频完全加载
      const handleCanPlayThrough = () => {
        if (video && !isNaN(video.duration) && video.duration > 0) {
          // 优先使用后端返回的时长，如果后端返回的时长无效，再使用视频文件的时长
          const backendDuration = currentVideo?.duration;
          if (typeof backendDuration === 'number' && !isNaN(backendDuration) && isFinite(backendDuration) && backendDuration > 0) {
            console.log('Using backend returned duration:', backendDuration);
            // 不更新，保持后端返回的时长
          } else {
            console.log('Got duration from canplaythrough:', video.duration);
            dispatch(setDuration(video.duration));
          }
        }
      };
      
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      
      // 尝试预加载视频元数据
      video.load();
      
      // 清理事件监听器
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
      };
    } else {
      console.log('Video source is empty');
      dispatch(setVideoLoading(false));
      dispatch(setDuration(0)); // 重置时长为0
    }
  }, [safeVideoSrc, playbackRate, volume, isMuted]);
  
  // 摄像头视频源和属性管理
  useEffect(() => {
    const webcam = webcamRef.current;
    if (!webcam) return;
    
    // 重置就绪状态
    setWebcamReady(false);
    
    // 先暂停并清空原有源
    webcam.pause();
    webcam.src = '';
    
    // 设置播放速率
    webcam.playbackRate = playbackRate;
    
    // 摄像头源变化时重新加载
    if (webcamUrl && webcamUrl !== 'about:blank') {
      console.log('Loading new webcam source:', webcamUrl);
      webcam.src = webcamUrl;
      webcam.load();
    } else {
      console.log('Webcam source is empty');
    }
  }, [webcamUrl, playbackRate]);
  
  // 音频源和属性管理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // 重置就绪状态
    setAudioReady(false);
    
    // 先暂停并清空原有源
    audio.pause();
    audio.src = '';
    
    // 设置播放速率和音量
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;
    
    // 音频源变化时重新加载
    if (audioSrc && audioSrc !== 'about:blank') {
      console.log('Loading new audio source:', audioSrc);
      audio.src = audioSrc;
      audio.load();
    } else {
      console.log('Audio source is empty');
    }
  }, [audioSrc, playbackRate, volume, isMuted]);
  
  // 根据播放状态控制所有媒体元素的暂停/停止
  useEffect(() => {
    const video = videoRef.current;
    const webcam = webcamRef.current;
    const audio = audioRef.current;
    
    if (playStatus === 'paused' || playStatus === 'stopped') {
      console.log('Pausing all media elements');
      if (video) video.pause();
      if (webcam) webcam.pause();
      if (audio) audio.pause();
    } else if (playStatus === 'playing') {
      // 播放状态下，主视频播放，摄像头和麦克风根据当前时间的状态决定是否播放
      if (video && video.paused) {
        video.play().catch(err => console.warn('Failed to play video:', err));
      }
      
      // 根据当前时间控制摄像头和麦克风的播放状态
      if (video && video.readyState >= 1) {
        controlMediaByTimestamps(video.currentTime);
      }
    }
  }, [playStatus]);
  
  // 高精度时间同步和状态检查
  useEffect(() => {
    let syncTimer: NodeJS.Timeout;

    if (playStatus === 'playing') {
      // 每50ms同步一次
      syncTimer = setInterval(() => {
        const video = videoRef.current;
        if (video && video.readyState >= 1) {
          syncMediaTime(video.currentTime);
          // 检查时间戳状态变化
          controlMediaByTimestamps(video.currentTime);
        }
      }, 50);
    }

    return () => clearInterval(syncTimer);
  }, [playStatus, webcamActive, audioActive]);
  
  // 初始时间同步
  useEffect(() => {
    const syncInitialTime = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 1) {
        syncMediaTime(video.currentTime);
      }
    };

    // 立即执行一次
    syncInitialTime();

    // 监听所有媒体的加载完成事件
    const video = videoRef.current;
    const webcam = webcamRef.current;
    const audio = audioRef.current;

    const videoLoadedHandler = syncInitialTime;
    const webcamLoadedHandler = syncInitialTime;
    const audioLoadedHandler = syncInitialTime;

    if (video) video.addEventListener('loadedmetadata', videoLoadedHandler);
    if (webcam) webcam.addEventListener('loadedmetadata', webcamLoadedHandler);
    if (audio) audio.addEventListener('loadedmetadata', audioLoadedHandler);

    return () => {
      if (video) video.removeEventListener('loadedmetadata', videoLoadedHandler);
      if (webcam) webcam.removeEventListener('loadedmetadata', webcamLoadedHandler);
      if (audio) audio.removeEventListener('loadedmetadata', audioLoadedHandler);
    };
  }, []);
  
  return (
    <>
      <div>
        <WebcamFloating 
          webcamRef={webcamRef} 
          webcamActive={webcamActive} 
          visible={showWebcam}
          onLoadedMetadata={handleWebcamLoadedMetadata}
          onError={handleWebcamError}
        />
        <Card
          title="录屏回放"
          variant="outlined"
          className="playback-card"
          styles={{
            header: {
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 'bold',
              padding: '12px 0'
            }
          }}
        >
          <div className="video-wrapper">
            <Spin spinning={videoLoading} className="video-loading" />
            <video
              ref={videoRef}
              controls={false}
              className="playback-video"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
            >
              您的浏览器不支持HTML5视频播放，请升级浏览器
            </video>
            
    
            <audio
              ref={audioRef}
              className="hidden-audio"
              onLoadedMetadata={handleAudioLoadedMetadata}
              onError={handleAudioError}
            >
              您的浏览器不支持HTML5音频播放，请升级浏览器
            </audio>
            
          
          </div>

    
          {playbackUrl && (
            <div className="download-links-container" style={{ marginTop: '16px' }}>
              <Typography.Text strong>下载链接：</Typography.Text>
             
              {(!currentVideo || !currentVideo.hashid) && (
                <a 
                  href={typeof playbackUrl === 'string' ? playbackUrl : playbackUrl.video} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ marginRight: '16px' }}
                  download
                >
                  视频文件
                </a>
              )}
            
              {currentVideo && currentVideo.hashid && (
                <>
                  <a 
                    href={`/api/recordings/${currentVideo.hashid}/subtitled-video`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ marginRight: '16px' }}
                    download
                  >
                    带字幕视频
                  </a>
                  <a 
                    href={`/api/recordings/${currentVideo.hashid}/screen`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ marginRight: '16px' }}
                    download
                  >
                    屏幕录制
                  </a>
                  <a 
                    href={`/api/recordings/${currentVideo.hashid}/webcam`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ marginRight: '16px' }}
                    download
                  >
                    摄像头录制
                  </a>
                  <a 
                    href={`/api/recordings/${currentVideo.hashid}/audio`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    download
                  >
                    音频文件
                  </a>
                </>
              )}
            </div>
          )}

        
          <div className="playback-controls-parent">
            <Row
              gutter={[12, 16]}
              align="middle"
              wrap={true}
              className="playback-controls"
            >
              <Col xs={6} sm={4} md={2}>
                <PlayButton
                  isPlayEnded={isPlayEnded}
                  status={playStatus}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStop={handleStop}
                  videoSrc={videoSrc}
                />
              </Col>

              <Col xs={6} sm={5} md={2} className="control-item">
                <PlaybackRate value={playbackRate} onChange={handleRateChange} />
              </Col>

              <Col xs={24} sm={24} md={15} className="progress-bar-container">
                <ProgressBar
                  onChange={handleProgressChange}
                />
              </Col>

              <Col xs={6} sm={5} md={3} className="control-item">
                <VolumeControl
                  volume={volume}
                  isMuted={isMuted}
                  onVolumeChange={handleVolumeUpdate}
                  onMuteToggle={handleMuteToggle}
                />
              </Col>
              
              <Col xs={6} sm={5} md={2} className="control-item">
                <Button
                  type="text"
                  icon={<VideoCameraOutlined />}
                  onClick={() => setShowWebcam(!showWebcam)}
                  size="small"
                  title={showWebcam ? '隐藏摄像头' : '显示摄像头'}
                />
              </Col>
            </Row>
          </div>
        </Card>
      </div>
      {contextHolder}
    </>
  );
};

export default PlayBackBody;