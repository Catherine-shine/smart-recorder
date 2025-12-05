
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
  stopPlayback,
  setCaptions,
  setCurrentCaption
} from '../../../store/slices/playbackSlice';
import PlayButton from './playButton/playButton';
import type { PlayStatus } from '../../../types/playback/playbackbody';
import ProgressBar from './progressBar/progressBar';
import VolumeControl from './volumeControl/volumeControl';
import PlaybackRate from './playBackRate/playBackRate';
import { Card, Row, Col, message, Spin } from 'antd';
import React, { useRef, useEffect, useState, useCallback } from "react";
import './index.css';
import type { caption } from '../../../types/playback/caption';

const PlayBackBody: React.FC = () => {
  const dispatch = useDispatch();
  // 从 Redux 中获取所有状态
  const {
    playbackUrl,
    status: playStatus,
    volume,
    isMuted,
    currentTime,
    duration,
    playbackRate,
    isPlayEnded,
    videoLoading,
    captions,        // 新增：字幕数组
    currentCaption
  } = useSelector((state: RootState) => state.playback);

  const videoRef = useRef<HTMLVideoElement>(null);

  // 优先使用Redux中保存的视频url，兜底用测试地址（建议替换为本地视频）
  const videoSrc = playbackUrl || 'https://www.w3school.com.cn/i/movie.mp4';

  //新增：字幕计时器
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 示例字幕数据（不调用后端API）
  const exampleCaptions: caption[] = [
    {
      start: 0, end: 1, text: '欢迎观看录屏回放',
      id: 0
    },
    {
      start: 1, end: 2, text: '这是示例字幕第一句',
      id: 1
    },
    {
      start: 2, end: 3, text: '这是示例字幕第二句',
      id: 2
    },
    
  ];

  // 新增：根据当前时间查找并显示当前这条字幕
  const updateSubtitle = useCallback(() => {
    if (!captions || captions.length === 0) return;
    // 查找当前时间对应的字幕
    const currentCap = captions.find(
      (c: caption) => currentTime >= c.start && currentTime <= c.end
    );

    // 如果找到了新的字幕，更新状态
    if (currentCap && currentCap.text !== currentCaption) {
      dispatch(setCurrentCaption(currentCap.text));
    } else if (!currentCap && currentCaption) {
      // 如果没有找到字幕，清空当前显示
      dispatch(setCurrentCaption(''));
    }
  }, [currentTime, captions, currentCaption, dispatch]);

  // 新增：初始化字幕获取（使用示例数据）
  useEffect(() => {
    if (playbackUrl) {
      // 使用示例字幕数据
      dispatch(setCaptions(exampleCaptions));
      //message.success('示例字幕加载成功！');
      console.log('加载示例字幕:', exampleCaptions);
    }
  }, [playbackUrl, dispatch]);

  // 新增：实时更新字幕显示
  useEffect(() => {
    updateSubtitle();

    // 设置定时器持续检查字幕更新
    if (playStatus === 'playing') {
      captionTimerRef.current = setInterval(updateSubtitle, 100); // 每100ms检查一次
    } else {
      if (captionTimerRef.current) {
        clearInterval(captionTimerRef.current);
        captionTimerRef.current = null;
      }
    }

    return () => {
      if (captionTimerRef.current) {
        clearInterval(captionTimerRef.current);
        captionTimerRef.current = null;
      }
    };
  }, [playStatus, updateSubtitle]);

  //保存最新的 volume，以在事件处理函数handleMuteToggle中使用
  const volumeRef = useRef(volume);
  // 当 volume 变化时更新 ref
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // 视频进度更新
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      dispatch(setCurrentTime(video.currentTime));
    }
  };

  // 视频元数据加载完成（获取总时长）
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      dispatch(setDuration(video.duration));
      dispatch(setPlaybackStatus('stopped'));
      dispatch(setVideoLoading(false));
      
    }
  };

  // 倍速变更（安全处理ref）
  const handleRateChange = (rate: number) => {
    dispatch(setPlaybackRate(rate));
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // 视频自身音量变化同步到状态
  const handleVolumeChange = () => {
    const video = videoRef.current;
    if (video) {
      dispatch(setVolume(video.volume));
      dispatch(setIsMuted(video.muted));
    }
  };

  // 播放结束处理
  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      dispatch(setCurrentTime(0));
      dispatch(setPlaybackStatus('stopped'));
      dispatch(setIsPlayEnded(true));
      message.success('视频播放结束！');
      dispatch(setCurrentCaption('')); // 新增：清空字幕
    }
  };

  // 播放操作（异步处理）
  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) {
      message.warning('视频播放器尚未加载完成，请稍候！');
      return;
    }
    video.play()
      .then(() => {
        dispatch(setPlaybackStatus('playing'));
        dispatch(setIsPlayEnded(false));
      })
      .catch((err) => {
        console.error('视频播放失败：', err);
        // 区分自动播放被拦截的情况
        if (err.name === 'NotAllowedError') {
          message.error('播放失败：浏览器禁止自动播放带音频的视频，请手动点击播放按钮并确保是首次交互！');
        } else if (err.name === 'AbortError') {
          message.error('视频加载被中断，请检查网络或视频源！');
        } else {
          message.error('播放失败，请检查视频源或浏览器权限！');
        }
        dispatch(setPlaybackStatus('stopped'));
      });
  };

  // 暂停操作
  const handlePause = () => {
    videoRef.current?.pause();
    dispatch(setPlaybackStatus('paused'));
  };

  // 停止
  const handleStop = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      dispatch(setCurrentTime(0));
      dispatch(setCurrentCaption('')); // 新增：清空字幕
    }
    dispatch(setPlaybackStatus('stopped'));
    dispatch(setIsPlayEnded(false));
  };

  // 音量更新（自定义控件）
  const handleVolumeUpdate = (vol: number) => {
    const video = videoRef.current;
    if (video) {
      video.volume = vol;
      video.muted = vol === 0;
      dispatch(setVolume(vol));
      dispatch(setIsMuted(vol === 0));
    }
  };

  // 静音切换（同步音量状态）
  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    const newisMuted = !isMuted;// 新的静音状态（是/否静音）
    dispatch(setIsMuted(newisMuted));
    video.muted = newisMuted;

    // 静音时记录当前音量，取消静音时恢复
    if (!newisMuted) {
      // 恢复原音量（使用 ref 中的 redux 状态值）
      video.volume = volumeRef.current;
    }
  };

  // 进度条拖动
  const handleProgressChange = (time: number) => {
    const video = videoRef.current;
    if (video && duration > 0) {
      const targetTime = Math.max(0, Math.min(time, duration));
      video.currentTime = targetTime;
      dispatch(setCurrentTime(targetTime));
      // 拖动后立即更新字幕
      updateSubtitle();
    }
  };

  // 视频错误监听（关键：排查播放失败原因）
  const handleVideoError = () => {
    const video = videoRef.current;
    if (!video || !video.error) return;

    const error = video.error;
    let errorMsg = '视频加载失败';
    // 根据错误码精准提示原因
    switch (error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        errorMsg = '视频加载被用户中断';
        break;
      case MediaError.MEDIA_ERR_NETWORK:
        errorMsg = '网络错误，视频加载失败（跨域/资源失效）';
        break;
      case MediaError.MEDIA_ERR_DECODE:
        errorMsg = '视频解码失败，格式不支持（建议使用MP4/H.264）';
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMsg = '视频源地址无效或不被浏览器支持';
        break;
      default:
        errorMsg = `未知错误：${error.message || error.code}`;
    }
    message.error(errorMsg);
    console.error('视频错误详情：', error);
    dispatch(setPlaybackStatus('stopped'));
    dispatch(setVideoLoading(false));
  };

  /////////////////////////////////////
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const eventHandlers = {
      timeupdate: handleTimeUpdate,
      loadedmetadata: handleLoadedMetadata,
      ended: handleVideoEnded,
      volumechange: handleVolumeChange,
      error: handleVideoError,
      loadstart: () => dispatch(setVideoLoading(true)),
      canplay: () => dispatch(setVideoLoading(false)),
      waiting: () => dispatch(setVideoLoading(true)),
      playing: () => dispatch(setVideoLoading(false)),
    };

    // 绑定事件
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      video.addEventListener(event, handler);
    });

    // 初始化视频属性
    if (video.playbackRate !== playbackRate) video.playbackRate = playbackRate;
    if (video.volume !== volume) video.volume = volume;
    if (video.muted !== isMuted) video.muted = isMuted;

    // 视频源变化时重新加载
    if (video.src !== videoSrc) {
      video.src = videoSrc;
      video.load(); // 手动触发加载
    }

    // 组件卸载/依赖变化时解绑事件+释放资源
    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        video.removeEventListener(event, handler);
      });
      // 释放Blob URL（防止内存泄漏）
      if (playbackUrl && playbackUrl.startsWith('blob:')) {
        URL.revokeObjectURL(playbackUrl);
      }
    };
  }, [playbackUrl, playbackRate, volume, isMuted, videoSrc]);

  return (
    <div>
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
          <Spin spinning={videoLoading} className="video-loading">
          </Spin>
          <video
            ref={videoRef}
            controls={false}
            className="playback-video"
            src={videoSrc}
          >
            您的浏览器不支持HTML5视频播放，请升级浏览器
          </video>
          {/* 新增：字幕显示区域 */}
          {currentCaption && (
            <div className="subtitle-display">
              <div className="subtitle-text">
                {currentCaption}
              </div>
            </div>
          )}
        </div>

        {/* 控制栏容器 */}
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
                currentTime={currentTime}
                duration={duration}
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
          </Row>
        </div>
      </Card>
    </div>
  )
};

export default PlayBackBody;


/*import type { RootState } from '../../../store';
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
  stopPlayback,
  setCaptions,
  setCurrentCaption
} from '../../../store/slices/playbackSlice';
import PlayButton from './playButton/playButton';
import type { PlayStatus } from '../../../types/playback/playbackbody';
import ProgressBar from './progressBar/progressBar';
import VolumeControl from './volumeControl/volumeControl';
import PlaybackRate from './playBackRate/playBackRate';
import { Card, Row, Col, message, Spin } from 'antd';
import React, { useRef, useEffect, useState,useCallback } from "react";
import './index.css';
import type { caption } from '../../../types/playback/caption';

const PlayBackBody: React.FC = () => {
    const dispatch = useDispatch();
  // 从 Redux 中获取所有状态
    const {
      playbackUrl,
      status: playStatus,
      volume,
      isMuted,
      currentTime,
      duration,
      playbackRate,
      isPlayEnded,
      videoLoading,
      captions,        // 新增：字幕数组
      currentCaption
    } = useSelector((state: RootState) => state.playback);
    const videoRef = useRef<HTMLVideoElement>(null);
   
    // 优先使用Redux中保存的视频url，兜底用测试地址（建议替换为本地视频）
    const videoSrc = playbackUrl || 'https://www.w3school.com.cn/i/movie.mp4';

     //新增：字幕计时器
    const captionTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 新增：调用后端API获取json格式字幕
  const fetchCaptions = useCallback(async () => {
    if (!playbackUrl) return;
    
    try {
      // 从视频URL中提取文件名
      const urlParts = playbackUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      // 调用后端API获取字幕
      const response = await fetch(`http://localhost:5000/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename,
        }),
      });
      
      if (!response.ok) {
        throw new Error('获取字幕失败');
      }
      
      const data = await response.json();
      
      if (data.success && data.subtitles) {
        dispatch(setCaptions(data.subtitles));//返回的json格式字幕
        message.success('字幕加载成功！');
      }
      } catch (error) {
        console.error('加载字幕失败:', error);
        message.warning('字幕加载失败');
      }
  }, [playbackUrl, dispatch]);

  // 新增：根据当前时间查找并显示当前这条字幕
  const updateSubtitle = useCallback(() => {
    if (!captions || captions.length === 0) return;
    // 查找当前时间对应的字幕
    const currentCap = captions.find(
      (c: caption) => currentTime >= c.start && currentTime <= c.end
    );
    
    // 如果找到了新的字幕，更新状态
    if (currentCap && currentCap.text !== currentCaption) {
      dispatch(setCurrentCaption(currentCap.text));
    } else if (!currentCap && currentCaption) {
      // 如果没有找到字幕，清空当前显示
      dispatch(setCurrentCaption(''));
    }
  }, [currentTime, captions, currentCaption, dispatch]);

  // 新增：初始化字幕获取
  useEffect(() => {
    if (playbackUrl && playbackUrl.includes('/api/video/')) {
      fetchCaptions();
    }
  }, [playbackUrl, fetchCaptions]);


  // 新增：实时更新字幕显示
  useEffect(() => {
    updateSubtitle();
    
    // 设置定时器持续检查字幕更新
    if (playStatus === 'playing') {
      captionTimerRef.current = setInterval(updateSubtitle, 100); // 每100ms检查一次
    } else {
      if (captionTimerRef.current) {
        clearInterval(captionTimerRef.current);
        captionTimerRef.current = null;
      }
    }
    
    return () => {
      if (captionTimerRef.current) {
        clearInterval(captionTimerRef.current);
        captionTimerRef.current = null;
      }
    };
  }, [playStatus, updateSubtitle]);




    //保存最新的 volume，以在事件处理函数handleMuteToggle中使用
    const volumeRef = useRef(volume);
    // 当 volume 变化时更新 ref
    useEffect(() => {
      volumeRef.current = volume;
    }, [volume]);
  
     // 视频进度更新
    const handleTimeUpdate = () => {
      const video = videoRef.current;
      if (video) {
        dispatch(setCurrentTime(video.currentTime));
      }
    };
    
    // 视频元数据加载完成（获取总时长）
    const handleLoadedMetadata = () => {
      const video = videoRef.current;
      if (video) {
        dispatch(setDuration(video.duration));
        dispatch(setPlaybackStatus('stopped'));
        dispatch(setVideoLoading(false));
      }
    };
    
    // 倍速变更（安全处理ref）
    const handleRateChange = (rate: number) => {
      dispatch(setPlaybackRate(rate));
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
      }
    };
    
    // 视频自身音量变化同步到状态
    const handleVolumeChange = () => {
      const video = videoRef.current;
      if (video) {
        dispatch(setVolume(video.volume));
        dispatch(setIsMuted(video.muted));
      }
    };
    
    // 播放结束处理
    const handleVideoEnded = () => {
      const video = videoRef.current;
      if (video) {
          video.currentTime = 0;
          setCurrentTime(0);
          dispatch(setPlaybackStatus('stopped'));
          dispatch(setIsPlayEnded(true));
          message.success('视频播放结束！');
          dispatch(setCurrentCaption('')); // 新增：清空字幕
      }
    };
    
    // 播放操作（异步处理）
    const handlePlay = () => {
      const video = videoRef.current;
      if (!video) {
        message.warning('视频播放器尚未加载完成，请稍候！');
        return;
      }
      video.play()
        .then(() => {
          dispatch(setPlaybackStatus('playing'));
          dispatch(setIsPlayEnded(false));
      })
        .catch((err) => {
          console.error('视频播放失败：', err);
          // 区分自动播放被拦截的情况
          if (err.name === 'NotAllowedError') {
            message.error('播放失败：浏览器禁止自动播放带音频的视频，请手动点击播放按钮并确保是首次交互！');
          } else if (err.name === 'AbortError') {
            message.error('视频加载被中断，请检查网络或视频源！');
          } else {
            message.error('播放失败，请检查视频源或浏览器权限！');
          }
          dispatch(setPlaybackStatus('stopped'));
        });
      };
    
      // 暂停操作
      const handlePause = () => {
        videoRef.current?.pause();
        dispatch(setPlaybackStatus('paused'));
      };
    
      // 停止
      const handleStop = () => {
        const video = videoRef.current;
        if (video) {
          video.pause();
          video.currentTime = 0;
          dispatch(setCurrentTime(0));
          dispatch(setCurrentCaption('')); // 新增：清空字幕
        }
        dispatch(setPlaybackStatus('stopped'));
        dispatch(setIsPlayEnded(false));
      };
    
      // 音量更新（自定义控件）
      const handleVolumeUpdate = (vol: number) => {
        setVolume(vol);
        setIsMuted(vol === 0); // 音量为0时自动静音
        const video = videoRef.current;
        if (video) {
          video.volume = vol;
          video.muted = vol === 0;
        }
      };
    
      // 静音切换（同步音量状态）
      const handleMuteToggle = () => {
          const video = videoRef.current;
          if (!video) return;
      
          const newisMuted = !isMuted;// 新的静音状态（是/否静音）
          dispatch(setIsMuted(newisMuted));
          video.muted = newisMuted;
      
          // 静音时记录当前音量，取消静音时恢复
          ///////// 2025.12.4优化///////////
           if (!newisMuted) {
              // 恢复原音量（使用 ref 中的 redux 状态值）
              video.volume = volumeRef.current;
              console.log(video.volume)
           }
      };
    
      // 进度条拖动
      const handleProgressChange = (time: number) => {
        const video = videoRef.current;
        if (video && duration > 0) {
          const targetTime = Math.max(0, Math.min(time, duration));
          video.currentTime = targetTime;
          dispatch(setCurrentTime(targetTime));
          // 拖动后立即更新字幕
          updateSubtitle();
        }
      };
    
      // 视频错误监听（关键：排查播放失败原因）
      const handleVideoError = () => {
        const video = videoRef.current;
        if (!video || !video.error) return;
    
        const error = video.error;
        let errorMsg = '视频加载失败';
        // 根据错误码精准提示原因
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMsg = '视频加载被用户中断';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMsg = '网络错误，视频加载失败（跨域/资源失效）';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMsg = '视频解码失败，格式不支持（建议使用MP4/H.264）';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = '视频源地址无效或不被浏览器支持';
            break;
          default:
            errorMsg = `未知错误：${error.message || error.code}`;
        }
        message.error(errorMsg);
        console.error('视频错误详情：', error);
        dispatch(setPlaybackStatus('stopped'));
        dispatch(setVideoLoading(false));
      };
      

      /////////////////////////////////////
      useEffect(() => {
          const video = videoRef.current;
          if (!video) return;
      
         
          const eventHandlers = {
            timeupdate: handleTimeUpdate,
            loadedmetadata: handleLoadedMetadata,
            ended: handleVideoEnded,
            volumechange: handleVolumeChange,
            error: handleVideoError,
            loadstart: () => dispatch(setVideoLoading(true)),
            canplay: () => dispatch(setVideoLoading(false)),
            waiting: () => dispatch(setVideoLoading(true)),
            playing: () => dispatch(setVideoLoading(false)),
          };
      
          // 绑定事件
          Object.entries(eventHandlers).forEach(([event, handler]) => {
            video.addEventListener(event, handler);
          });
      
          // 初始化视频属性
          if (video.playbackRate !== playbackRate) video.playbackRate = playbackRate;
          if (video.volume !== volume) video.volume = volume;
          if (video.muted !== isMuted) video.muted = isMuted;
      
          // 视频源变化时重新加载
          if (video.src !== videoSrc) {
            video.src = videoSrc;
            video.load(); // 手动触发加载
          }
      
          // 组件卸载/依赖变化时解绑事件+释放资源
          return () => {
            Object.entries(eventHandlers).forEach(([event, handler]) => {
              video.removeEventListener(event, handler);
            });
            // 释放Blob URL（防止内存泄漏）
            if (playbackUrl && playbackUrl.startsWith('blob:')) {
              URL.revokeObjectURL(playbackUrl);
            }
          };
      }, [playbackUrl, playbackRate, volume, isMuted, videoSrc]); 

      return (
        <div>
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
                <Spin spinning={videoLoading}  className="video-loading">
                  </Spin>
                  <video
                    ref={videoRef}
                    controls={false}
                    className="playback-video"
                    src={videoSrc}
                   
                  >
                    您的浏览器不支持HTML5视频播放，请升级浏览器
                  </video>
                
                  {currentCaption && (
                    <div className="subtitle-display">
                      <div className="subtitle-text">
                        {currentCaption}
                      </div>
                    </div>
                  )}
                
              </div>

          
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
                      currentTime={currentTime}
                      duration={duration}
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
                </Row>
              </div>
            </Card>
        </div>
      )
};

export default PlayBackBody;*/
