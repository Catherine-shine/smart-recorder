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
} from '../../../store/slices/playbackSlice';
import PlayButton from './playButton/playButton';
import type { PlayStatus } from '../../../types/playback/playbackbody';
import ProgressBar from './progressBar/progressBar';
import VolumeControl from './volumeControl/volumeControl';
import PlaybackRate from './playBackRate/playBackRate';
import { Card, Row, Col, message, Spin } from 'antd';
import React, { useRef, useEffect, useState } from "react";
import './index.css';

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
    } = useSelector((state: RootState) => state.playback);

    const videoRef = useRef<HTMLVideoElement>(null);
    // 优先使用Redux中保存的视频url，兜底用测试地址（建议替换为本地视频）
    const videoSrc = playbackUrl;

    //保存最新的 volume，以在事件处理函数handleMuteToggle中使用
    const volumeRef = useRef(volume);
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
        console.log('Loaded metadata:', { duration: video.duration, readyState: video.readyState });
        // 只有当视频元素提供了有效的duration且大于0时才更新，否则保持Redux中已有的正确值
        // 避免视频元素返回0时长时覆盖视频列表中设置的正确时长
        const validDuration = (isNaN(video.duration) || !isFinite(video.duration) || video.duration <= 0) ? undefined : video.duration;
      
        dispatch(setPlaybackStatus('stopped'));
        dispatch(setVideoLoading(false));
        if (validDuration !== undefined) {
          dispatch(setDuration(validDuration));
        }
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
        }
        dispatch(setPlaybackStatus('stopped'));
        dispatch(setIsPlayEnded(false));
      };
    
      // 音量更新（自定义控件）
      const handleVolumeUpdate = (vol: number) => {
        dispatch(setVolume(vol));
        dispatch(setIsMuted(vol === 0)); // 音量为0时自动静音
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
        // 修复：视频加载失败时不再重置duration为0，因为我们已经从录制数据中知道了正确的时长
        // 只有当视频源确实无效时（如MEDIA_ERR_SRC_NOT_SUPPORTED）才考虑重置
        if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          dispatch(setDuration(0));
        }
      };
      

      /////////////////////////////////////
      useEffect(() => {
          const video = videoRef.current;
          if (!video) {
            console.log('Video element not found');
            return;
          }
          console.log('Video element initialized:', video);
          console.log('Current videoSrc:', videoSrc);
          console.log('Current playbackUrl:', playbackUrl);
      
         
          const eventHandlers = {
            timeupdate: () => {
              console.log('timeupdate event triggered');
              handleTimeUpdate();
            },
            loadedmetadata: () => {
              console.log('loadedmetadata event triggered');
              handleLoadedMetadata();
            },
            ended: () => {
              console.log('ended event triggered');
              handleVideoEnded();
            },
            volumechange: () => {
              console.log('volumechange event triggered');
              handleVolumeChange();
            },
            error: (e: Event) => {
              console.log('error event triggered:', e);
              handleVideoError();
            },
            loadstart: () => {
              console.log('loadstart event triggered');
              dispatch(setVideoLoading(true));
            },
            canplay: () => {
              console.log('canplay event triggered');
              dispatch(setVideoLoading(false));
            },
            waiting: () => {
              console.log('waiting event triggered');
              dispatch(setVideoLoading(true));
            },
            playing: () => {
              console.log('playing event triggered');
              dispatch(setVideoLoading(false));
            },
          };
      
          // 绑定事件
          Object.entries(eventHandlers).forEach(([event, handler]) => {
            console.log('Adding event listener:', event);
            video.addEventListener(event, handler);
          });
      
          // 初始化视频属性
          if (video.playbackRate !== playbackRate) video.playbackRate = playbackRate;
          if (video.volume !== volume) video.volume = volume;
          if (video.muted !== isMuted) video.muted = isMuted;
      
          // 视频源变化时重新加载
          if (video.src !== videoSrc) {
            console.log('Video source changed, loading new video:', videoSrc);
            console.log('Old video src:', video.src);
            video.src = videoSrc;
            
            // 当videoSrc为空时，重置视频状态
            if (!videoSrc) {
              console.log('Video source is empty, resetting video state');
              video.pause();
              dispatch(setCurrentTime(0));
              dispatch(setDuration(0));
              dispatch(setPlaybackStatus('stopped'));
              dispatch(setVideoLoading(false));
              dispatch(setIsPlayEnded(false));
            } else {
              video.load(); // 手动触发加载
            }
          } else {
            console.log('Video source is the same, checking ready state:', video.readyState);
            if (video.readyState >= 2) {
              console.log('Video already has metadata, checking duration:', video.duration);
              // 只有当视频元素提供了有效的duration且大于0时才更新，否则保持Redux中已有的正确值
              const validDuration = (isNaN(video.duration) || !isFinite(video.duration) || video.duration <= 0) ? undefined : video.duration;
              if (validDuration !== undefined) {
                dispatch(setDuration(validDuration));
              }
            } else {
              console.log('Video ready state is insufficient, forcing load...');
              video.load(); // 强制重新加载
            }
          }
      
          // 组件卸载/依赖变化时解绑事件
          return () => {
            Object.entries(eventHandlers).forEach(([event, handler]) => {
              video.removeEventListener(event, handler);
            });
            // 注意：不要在playBackBody中释放Blob URL，因为它可能被playBackList使用
            // Blob URL的释放应该由创建它的组件（playBackList）负责
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
