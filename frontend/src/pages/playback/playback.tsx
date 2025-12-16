import PlaybackList from "../../components/playback/playBackList/playBackList";
import {  Row, Col, message} from 'antd';
import React ,{useState} from "react";
import './index.css';
import PlayBackBody from "../../components/playback/playBackBody/playBackBody";
import { getRecordingDetail} from "../../api/recording"; // 导入封装的接口
import type { RecordingDetailResponse } from "../../types/api/apiTypes";
import { useDispatch } from 'react-redux';
import { setDuration, setTrajectoryData, setPlaybackUrl, setAudioUrl, setWebcamUrl } from "../../store/slices/playbackSlice";

interface RecordingDetailResponseWithWhiteboard extends RecordingDetailResponse {
  whiteboard?: {
    operations: any[]; 
  };
}

const PlaybackModule: React.FC = () => { 
  const dispatch = useDispatch();
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false); // 接口加载状态
 const [whiteboardOperations, setWhiteboardOperations] = useState<any[]>([]);
  

  const handleSelectRecording = async (recordingId: string) => {
    try {
      setLoading(true);
      // 获取录制详情
      const recordingData = await getRecordingDetail(recordingId) as RecordingDetailResponseWithWhiteboard;
      setWhiteboardOperations(recordingData.whiteboard?.operations || []);
      setSelectedRecording(recordingData);
      
      // 更新Redux中的录制时长
      // 优先使用后端API直接返回的duration（秒）
      if (recordingData.duration && recordingData.duration > 0) {
        dispatch(setDuration(recordingData.duration));
      } 

      // 处理轨迹数据
      if (recordingData.trajectory) {
        try {
          const trajectoryData = typeof recordingData.trajectory === 'string' 
            ? JSON.parse(recordingData.trajectory) 
            : recordingData.trajectory;
          
          // 如果后端没有返回duration，则尝试从轨迹数据中提取
          if ((!recordingData.duration || recordingData.duration <= 0) && trajectoryData.duration) {
            dispatch(setDuration(trajectoryData.duration));
          }
          
          if (trajectoryData) {
            dispatch(setTrajectoryData(trajectoryData));
            
            // 更新白板操作数据
            // 尝试多种可能的结构
            const ops = trajectoryData.whiteboardData || 
                       (trajectoryData.whiteboard && trajectoryData.whiteboard.operations) || 
                       trajectoryData.whiteboard || 
                       [];
            setWhiteboardOperations(ops);
          }
        } catch (error) {
          console.error('Failed to parse trajectory data:', error);
          message.error('解析轨迹数据失败');
        }
      } else {
        // 如果没有轨迹数据，清空
        setWhiteboardOperations([]);
      }

      // 设置播放地址
      if (recordingData.screenRecordingUrl) {
        dispatch(setPlaybackUrl(recordingData.screenRecordingUrl));
      }
      if (recordingData.audioUrl) {
        dispatch(setAudioUrl(recordingData.audioUrl));
      }
      if (recordingData.webcamRecordingUrl) {
        dispatch(setWebcamUrl(recordingData.webcamRecordingUrl));
      }
      
      message.success('加载录制内容成功');
    } catch (err) {
      message.error('加载录制内容失败');
      console.error('Failed to load recording:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocalRecording = (recording: any) => {
    // 本地录制数据结构中，whiteboardData 已经是操作数组
    // 需要将绝对时间戳转换为相对时间戳（相对于录制开始时间）
    const startTime = recording.timestamp;
    const normalizedOperations = (recording.whiteboardData || []).map((op: any) => ({
      ...op,
      timestamp: op.timestamp - startTime
    }));
    setWhiteboardOperations(normalizedOperations);
  };

  // 视频时间同步：秒 → 毫秒（白板用毫秒）
  const handleVideoTimeUpdate = (timeInSeconds: number) => {
    setVideoCurrentTime(timeInSeconds * 1000);
  };

  return (
  <div className="playback-container">
    <div className="playback-content">
      <Row gutter={[20, 20]} className="playback-layout">
        {/* 回放列表 */}
        <Col xs={24} sm={6} md={6} lg={5} className="playback-list-col">
          <PlaybackList
            onSelectRecording={handleSelectRecording} 
            onSelectLocalRecording={handleSelectLocalRecording}
          />
        </Col>

        {/* 播放器区域 */}
        <Col xs={24} sm={18} md={18} lg={19} className="playback-player-col">
          <PlayBackBody 
            onTimeUpdate={handleVideoTimeUpdate}
          />
        </Col>
      </Row>
    </div>
  </div>
);
};

export default PlaybackModule;