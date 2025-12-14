
import PlaybackList from "../../components/playback/playBackList/playBackList";
import {  Row, Col, message} from 'antd';
import React ,{useState} from "react";
import './index.css';
import PlayBackBody from "../../components/playback/playBackBody/playBackBody";
import WhiteboardPlayback from "../../components/playback/playBackWhiteboard/playBackWhiteboard";
import { getRecordingDetail } from "../../api/recording"; // 导入封装的接口
import type { RecordingDetailResponse } from "../../types/api/apiTypes";

interface RecordingDetailResponseWithWhiteboard extends RecordingDetailResponse {
  whiteboard?: {
    operations: any[]; // 或导入 WhiteboardOperation 类型
  };
}
//注明组件的 ts 类型是 React 函数式组件（React.FC）
const PlaybackModule: React.FC = () => { 
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // 播放状态
  const [loading, setLoading] = useState(false); // 接口加载状态
 const [whiteboardOperations, setWhiteboardOperations] = useState<any[]>([]);
  

  // const handleSelectRecording = async (recordingId: string) => {
  //   try {
  //     const data = await getRecordingDetail(recordingId) as RecordingDetailResponseWithWhiteboard;
  //     setWhiteboardOperations(data.whiteboard?.operations || []);
  //   } catch (err) {
  //     message.error('加载白板轨迹失败');
  //   }
  // };
  const handleSelectRecording = async (recordingId: string) => {
  try {
    setLoading(true);
    const data = await getRecordingDetail(recordingId) as RecordingDetailResponseWithWhiteboard;
    
    // 1. 设置白板数据
    setWhiteboardOperations(data.whiteboard?.operations || []);
    
    // 2. 更新选中的录制项
    setSelectedRecording(data);
    
    // 3. 根据后端返回的URL设置视频播放地址
    // 优先使用带字幕的视频，否则使用屏幕录制
    const videoUrl = data.subtitledVideoUrl || data.screenRecordingUrl;
    if (videoUrl) {
      // 这里可能需要dispatch到Redux store，或者直接设置状态
      // 取决于你的架构
      console.log('选中录制的视频URL:', videoUrl);
    }
    
  } catch (err) {
    console.error('加载录制详情失败:', err);
    message.error('加载录制详情失败');
  } finally {
    setLoading(false);
  }
};
  // 视频时间同步：秒 → 毫秒（白板用毫秒）
  const handleVideoTimeUpdate = (timeInSeconds: number) => {
    setVideoCurrentTime(timeInSeconds * 1000);
  };

  return (
    <div className="playback-container">
      <div className="playback-content">
          <Row gutter={[0, 20]}>
            {/* 第一行：列表 + 白板回放 */}
            <Col xs={24}>
            {/* 整体布局：桌面端左列表右白板，移动端上列表下白板 */}
              <Row gutter={[20, 20]} className="playback-layout">
                {/* 回放列表：桌面端占8列，平板占6列，移动端占24列 */}
                <Col xs={24} sm={6} md={6} lg={5} className="playback-list-col">
                  <PlaybackList
                  onSelectRecording={handleSelectRecording} 
                  />
                </Col>

                {/* 白板回放区域：桌面端占16列，平板占18列，移动端占24列 */}
                <Col xs={24} sm={18} md={18} lg={19} className="playback-player-col">
                {/* 仅添加必要高度，避免布局塌陷 */}
                <div style={{ height: 500 }}>
                  <WhiteboardPlayback
                  operations={whiteboardOperations} // 传入白板数据
                  currentTime={videoCurrentTime}    // 与视频时间同步
                  isDarkMode={false}
                  />
                </div>
                </Col>
                
              </Row>
            </Col>
            {/* 第二行：视频播放器 */}
            <Col xs={24}>
              <PlayBackBody 
              onTimeUpdate={handleVideoTimeUpdate} // 接收视频时间
              />
            </Col>
        </Row>
      </div>
       
    </div>
  );
};

export default PlaybackModule;