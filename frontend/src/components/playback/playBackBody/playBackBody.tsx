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
import { Card, Row, Col, Spin, Typography, message } from 'antd';
import React, { useRef, useEffect, useState } from "react";
import WebcamFloating from '../webcamFloating/webcamFloating';
import './index.css';

const PlayBackBody: React.FC = () => {
    const dispatch = useDispatch();
    const [messageApi, contextHolder] = message.useMessage();
  // 从 Redux 中获取所有状态
    const {
      playbackUrl,
      webcamUrl,
      audioUrl,
      status: playStatus,
      volume,
      isMuted,
      currentTime,
      duration,
      playbackRate,
      isPlayEnded,
      videoLoading,
      currentVideo,
    } = useSelector((state: RootState) => state.playback);

    const videoRef = useRef<HTMLVideoElement>(null);
    const webcamRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    // 优先使用Redux中保存的视频url，兜底用测试地址（建议替换为本地视频）
    const videoSrc = (typeof playbackUrl === 'object' && playbackUrl !== null ? playbackUrl.video : playbackUrl) || '';
    // 从Redux中获取麦克风音频url
    const audioSrc = audioUrl || '';
    
    // 确保videoSrc始终是有效的字符串
    const safeVideoSrc = videoSrc && videoSrc !== 'about:blank' ? videoSrc : '';

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
    
    // 视频元数据加载完成（不再从视频元素获取时长，只更新播放状态和加载状态）
    const handleLoadedMetadata = () => {
      const video = videoRef.current;
      if (video) {
        console.log('Loaded metadata:', { duration: video.duration, readyState: video.readyState });
      
        dispatch(setPlaybackStatus('stopped'));
        dispatch(setVideoLoading(false));
        // 不再更新duration，使用后端返回的录屏时长
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
          messageApi.success('视频播放结束！');
      }
    };
    
    // 播放操作（异步处理）
    const handlePlay = () => {
      const video = videoRef.current;
      
      if (!video) {
        messageApi.warning('视频播放器尚未加载完成，请稍候！');
        return;
      }
      
      // 验证视频源是否有效
      if (!safeVideoSrc || safeVideoSrc === 'about:blank') {
        messageApi.error('视频源无效，请重新选择视频！');
        return;
      }
      
      const playPromises = [video.play()];
      // 只有当摄像头元素和有效的摄像头URL都存在时，才尝试播放摄像头视频
      if (webcamRef.current && webcamUrl && webcamUrl !== '') {
        playPromises.push(webcamRef.current.play());
      }
      // 只有当音频元素和有效的音频URL都存在时，才尝试播放麦克风音频
      if (audioRef.current && audioSrc && audioSrc !== '') {
        playPromises.push(audioRef.current.play());
      }
      
      Promise.all(playPromises)
        .then(() => {
          dispatch(setPlaybackStatus('playing'));
          dispatch(setIsPlayEnded(false));
      })
        .catch((err) => {
          console.error('视频播放失败：', err);
          // 区分不同类型的播放错误
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
        videoRef.current?.pause();
        webcamRef.current?.pause();
        audioRef.current?.pause();
        dispatch(setPlaybackStatus('paused'));
      };
    
      // 停止
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
        dispatch(setIsPlayEnded(false));
      };
    
      // 音量更新（自定义控件） - 只控制麦克风音频音量
      const handleVolumeUpdate = (vol: number) => {
        dispatch(setVolume(vol));
        dispatch(setIsMuted(vol === 0)); // 音量为0时自动静音
        const audio = audioRef.current;
        
        if (audio) {
          audio.volume = vol;
          audio.muted = vol === 0;
        }
      };
    
      // 静音切换（同步音量状态） - 只控制麦克风音频静音
      const handleMuteToggle = () => {
          const audio = audioRef.current;
          if (!audio) return;
      
          const newisMuted = !isMuted;// 新的静音状态（是/否静音）
          dispatch(setIsMuted(newisMuted));
          
          if (audio) {
            audio.muted = newisMuted;
          }
          
          // 静音时记录当前音量，取消静音时恢复
          ///////// 2025.12.4优化///////////
           if (!newisMuted) {
              const restoreVolume = volumeRef.current;
              if (audio) {
                audio.volume = restoreVolume;
              }
              console.log('恢复音量:', restoreVolume);
           }
      };
    
      // 进度条拖动
      const handleProgressChange = (time: number) => {
        const video = videoRef.current;
        const webcam = webcamRef.current;
        const audio = audioRef.current;
        
        if ((video || webcam || audio) && duration > 0) {
          const targetTime = Math.max(0, Math.min(time, duration));
          
          if (video) {
            video.currentTime = targetTime;
          }
          
          if (webcam) {
            webcam.currentTime = targetTime;
          }
          
          if (audio) {
            audio.currentTime = targetTime;
          }
          
          dispatch(setCurrentTime(targetTime));
        }
      };
    
      // 视频错误监听
      const handleVideoError = () => {
        messageApi.error('视频加载失败！');
        dispatch(setPlaybackStatus('stopped'));
        dispatch(setDuration(0));
        dispatch(setVideoLoading(false));
      };
      

      /////////////////////////////////////
      useEffect(() => {
          const video = videoRef.current;
          
          // Setup video element
          
          if (!video) {
            console.error('Video element not found');
            return;
          }
      
          // 视频事件处理
          const videoEventHandlers = {
            timeupdate: () => {
              handleTimeUpdate();
              // 视频进度更新时，同步摄像头视频和麦克风音频进度
              if (webcamRef.current) {
                webcamRef.current.currentTime = video.currentTime;
              }
              if (audioRef.current) {
                audioRef.current.currentTime = video.currentTime;
              }
            },
            loadedmetadata: () => {
              handleLoadedMetadata();
            },
            ended: () => {
              handleVideoEnded();
              // 视频结束时，同步停止摄像头视频和麦克风音频
              if (webcamRef.current) {
                webcamRef.current.pause();
                webcamRef.current.currentTime = 0;
              }
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
            },
            volumechange: () => {
              handleVolumeChange();
            },
            error: (e: Event) => {
              handleVideoError();
            },
            loadstart: () => {
              dispatch(setVideoLoading(true));
            },
            canplay: () => {
              dispatch(setVideoLoading(false));
            },
            waiting: () => {
              dispatch(setVideoLoading(true));
            },
            playing: () => {
              console.log('playing event triggered');
              dispatch(setVideoLoading(false));
            },
          };
      
          // 绑定视频事件
          Object.entries(videoEventHandlers).forEach(([event, handler]) => {
            console.log('Adding video event listener:', event);
            video.addEventListener(event, handler);
          });
      
          // 初始化视频属性
          if (video.playbackRate !== playbackRate) video.playbackRate = playbackRate;
          if (video.volume !== volume) video.volume = volume;
          if (video.muted !== isMuted) video.muted = isMuted;
      
          // 确保视频元素有有效的src
          if (!video.src && safeVideoSrc && safeVideoSrc !== 'about:blank') {
            video.src = safeVideoSrc;
            video.load();
          }
      
          // 视频源变化时重新加载
          if (video.src !== safeVideoSrc) {
            // 确保safeVideoSrc不为空
            if (!safeVideoSrc || safeVideoSrc === 'about:blank') {
              video.pause();
              dispatch(setCurrentTime(0));
              dispatch(setDuration(0));
              dispatch(setPlaybackStatus('stopped'));
              dispatch(setVideoLoading(false));
              dispatch(setIsPlayEnded(false));
              return;
            }
            
            video.src = safeVideoSrc;
            video.load(); // 手动触发加载
          } else {
            // 不再从视频元素获取时长，始终使用后端返回的录屏时长
            if (video.readyState >= 2) {
              console.log('Video ready state is sufficient, using backend-provided duration');
            } else {
              console.log('Video ready state is insufficient, forcing load...');
              // 确保视频源有效
              if (safeVideoSrc && safeVideoSrc !== 'about:blank') {
                video.load(); // 强制重新加载
              }
            }
          }
      
          // 组件卸载/依赖变化时解绑事件
          return () => {
            // 解绑视频事件
            Object.entries(videoEventHandlers).forEach(([event, handler]) => {
              video.removeEventListener(event, handler);
            });
            
            // 注意：不要在playBackBody中释放Blob URL，因为它可能被playBackList使用
            // Blob URL的释放应该由创建它的组件（playBackList）负责
          };
      }, [playbackUrl, playbackRate, volume, isMuted, videoSrc]);

      // 麦克风音频设置和管理
      useEffect(() => {
          const audio = audioRef.current;
          
          // Setup audio element

          
          if (!audio) {
            console.error('Audio element not found');
            return;
          }
      
          // 初始化音频属性
          audio.volume = volume;
          audio.muted = isMuted;
      
          // 音频源变化时重新加载
          if (audio.src !== audioSrc) {
            
            
            // 确保audioSrc不为空
            if (!audioSrc || audioSrc === 'about:blank') {
              console.log('Audio source is empty, resetting audio state');
              audio.src = '';
              audio.pause();
              return;
            }
            
            audio.src = audioSrc;
            audio.load(); // 手动触发加载
          }
      }, [audioSrc, volume, isMuted]); 

      return (
        <>
          <div>
          {/* 摄像头悬浮窗 */}
          <WebcamFloating webcamRef={webcamRef} />
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
                    src={safeVideoSrc}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                  >
                    您的浏览器不支持HTML5视频播放，请升级浏览器
                  </video>
                  {/* 隐藏的音频元素，用于播放麦克风音频 */}
                  <audio
                    ref={audioRef}
                    className="hidden-audio"
                    src={audioSrc}
                  >
                    您的浏览器不支持HTML5音频播放，请升级浏览器
                  </audio>
              </div>

              {/* 下载链接区域 - 对所有视频显示 */}
              {playbackUrl && (
                <div className="download-links-container" style={{ marginTop: '16px' }}>
                    <Typography.Text strong>下载链接：</Typography.Text>
                    {/* 对于本地视频，显示基本的视频文件下载链接 */}
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
                    {/* 对于后端视频，显示完整的下载链接 */}
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
          {contextHolder}
        </>
      );
};

export default PlayBackBody;
