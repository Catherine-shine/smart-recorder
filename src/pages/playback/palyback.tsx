import { icons } from "antd/es/image/PreviewGroup";
import PlayButton from '../../components/playback/playButton/playButton';
import type { PlayStatus } from '../../types/playback';
import { Card, Row, Col ,message} from 'antd';
import React, { useState, useRef, useEffect } from "react";


const playbackmodule: React.FC = () => {

  const [playStatus, setPlayStatus] = useState<PlayStatus>('stopped');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlayEnded, setIsPlayEnded] = useState<boolean>(false);
  const [videoSrc] = useState('https://www.w3school.com.cn/i/movie.mp4');
  const videoRef = useRef<HTMLVideoElement>(null);
  
    const handlePlay = () => {
   if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error('视频播放失败：', err);
        message.error('播放失败，请检查视频源或浏览器权限！');
      });
    }
    setPlayStatus('playing');
    setIsPlayEnded(false); 
  };

  // 暂停操作
  const handlePause = () => {
    videoRef.current?.pause();
    setPlayStatus('paused');
  };

  // 停止操作
  const handleStop = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
        video.currentTime = 0; // 重置播放进度到开头
      setCurrentTime(0); // 同步更新进度状态
    }
    setPlayStatus('stopped');
     setIsPlayEnded(false);
  };

   const handleVideoEnded = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0; // 重置进度到开头
      setCurrentTime(0); // 同步更新进度状态
      setPlayStatus('stopped'); // 切换为停止状态
      setIsPlayEnded(true);
      message.success('视频播放结束！'); // 可选：播放结束提示
    }
  };

  return (
    <div>
      <Card title="录屏回放" bordered={true} style={{ marginTop: 20 }} headStyle={{ textAlign: 'center',fontSize: 24, fontWeight: 'bold' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <video
          ref={videoRef}
          width="800"
          height="450"
          controls={false}
          style={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
          src={videoSrc}
          onEnded={handleVideoEnded} // 绑定播放结束事件
        >
          您的浏览器不支持HTML5视频播放，请升级浏览器
        </video>
         
      </div>
       <Row gutter={[16, 16]} align="middle">
             <Col xs={24} sm={6} md={4}>
             <PlayButton
            status={playStatus}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            videoSrc={videoSrc} 
            isPlayEnded={isPlayEnded}
          />
             </Col>
              <Col xs={24} sm={6} md={4}>
             1
             </Col>
              <Col xs={24} sm={6} md={4}>
             1
             </Col>
              <Col xs={24} sm={6} md={4}>
             1
             </Col>
          </Row>
      </Card>
    </div>
  );
};
export default playbackmodule;
