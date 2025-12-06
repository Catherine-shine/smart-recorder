import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Typography, Select } from 'antd';
import { 
  CameraOutlined, 
  AudioOutlined, 
  AudioMutedOutlined,
  SettingOutlined,
  LoadingOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

const VideoPreview: React.FC = () => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null); // 改用state
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. 获取设备列表
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);
        
        const cameras = deviceList.filter(d => d.kind === 'videoinput');
        const mics = deviceList.filter(d => d.kind === 'audioinput');
        
        if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
      } catch (error) {
        console.error('获取设备列表失败:', error);
      }
    };
    getDevices();
  }, []);

  // 2. 关键修复：监听摄像头状态变化，更新视频元素
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      console.log('设置视频srcObject:', mediaStream);
      videoRef.current.srcObject = mediaStream;
      
      // 确保播放
      videoRef.current.play().catch(e => {
        console.error('自动播放失败，尝试用户交互后播放:', e);
      });
    } else if (videoRef.current && !mediaStream) {
      console.log('清除视频srcObject');
      videoRef.current.srcObject = null;
    }
  }, [mediaStream]); // 监听mediaStream变化

  // 3. 开启/关闭摄像头
  const toggleCamera = async () => {
    if (isCameraOn) {
      // 关闭摄像头
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      setMediaStream(null);
      setIsCameraOn(false);
      setIsMicOn(false);
    } else {
      // 开启摄像头
      setIsLoading(true);
      
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedCamera ? { 
            deviceId: { exact: selectedCamera }
          } : true,
          audio: selectedMic ? { deviceId: { exact: selectedMic } } : true
        };
        
        console.log('获取媒体流，约束:', constraints);
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('媒体流获取成功，轨道:', stream.getTracks().map(t => t.kind));
        
        // 使用setState触发useEffect更新
        setMediaStream(stream);
        setIsCameraOn(true);
        setIsMicOn(true);
        
      } catch (error) {
        console.error('开启摄像头失败:', error);
        alert(`无法访问摄像头: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 4. 切换麦克风
  const toggleMicrophone = () => {
    if (!mediaStream) return;
    
    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks.forEach(track => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
    }
  };

  // 5. 清理
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CameraOutlined style={{ color: '#007bff' }} />
          <Text strong>视频预览</Text>
        </div>
      }
      style={{ 
        height: '100%',
        borderRadius: '12px'
      }}
      bodyStyle={{ 
        padding: '16px',
        height: 'calc(100% - 57px)',
        display: 'flex',
        flexDirection: 'column'
      }}
      extra={
        <Button 
          type="text" 
          icon={<SettingOutlined />}
          onClick={() => setShowSettings(!showSettings)}
          size="small"
        />
      }
    >
      {/* 设备设置面板 */}
      {showSettings && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>摄像头</Text>
              <Select
                size="small"
                style={{ width: '100%', marginTop: '4px' }}
                value={selectedCamera}
                onChange={setSelectedCamera}
                disabled={isCameraOn}
              >
                {devices
                  .filter(d => d.kind === 'videoinput')
                  .map(device => (
                    <Option key={device.deviceId} value={device.deviceId}>
                      {device.label || `摄像头 ${device.deviceId.slice(0, 5)}...`}
                    </Option>
                  ))}
              </Select>
            </div>
            
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>麦克风</Text>
              <Select
                size="small"
                style={{ width: '100%', marginTop: '4px' }}
                value={selectedMic}
                onChange={setSelectedMic}
                disabled={isCameraOn}
              >
                {devices
                  .filter(d => d.kind === 'audioinput')
                  .map(device => (
                    <Option key={device.deviceId} value={device.deviceId}>
                      {device.label || `麦克风 ${device.deviceId.slice(0, 5)}...`}
                    </Option>
                  ))}
              </Select>
            </div>
          </Space>
        </div>
      )}

      {/* 视频预览区 */}
      <div style={{ 
        flex: 1,
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        minHeight: '250px',
        position: 'relative'
      }}>
        {isLoading ? (
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <LoadingOutlined style={{ fontSize: '32px', marginBottom: '12px' }} />
            <div>正在启动摄像头...</div>
          </div>
        ) : isCameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            muted={!isMicOn}
            playsInline
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: 'scaleX(-1)',
              backgroundColor: '#000'
            }}
            onCanPlay={() => console.log('视频可以播放了！')}
            onLoadedData={() => console.log('视频数据已加载')}
            onPlaying={() => console.log('视频正在播放')}
            onError={(e) => {
              console.error('视频错误:', e);
              console.error('视频错误详情:', videoRef.current?.error);
            }}
          />
        ) : (
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <CameraOutlined style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }} />
            <div>摄像头未开启</div>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <Space style={{ justifyContent: 'center', width: '100%' }}>
        <Button
          type={isCameraOn ? 'default' : 'primary'}
          icon={<CameraOutlined />}
          onClick={toggleCamera}
          style={{ minWidth: '140px' }}
          loading={isLoading}
        >
          {isCameraOn ? '关闭摄像头' : isLoading ? '启动中...' : '开启摄像头'}
        </Button>
        
        <Button
          type={isMicOn ? 'primary' : 'default'}
          icon={isMicOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          onClick={toggleMicrophone}
          disabled={!isCameraOn || isLoading}
          style={{ minWidth: '140px' }}
        >
          {isMicOn ? '关闭麦克风' : '开启麦克风'}
        </Button>
      </Space>

      {/* 调试面板 */}
      <div style={{ 
        marginTop: '12px', 
        padding: '8px', 
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#666',
        display: process.env.NODE_ENV === 'development' ? 'block' : 'none'
      }}>
        <div>摄像头: {isCameraOn ? '已开启' : '已关闭'}</div>
        <div>麦克风: {isMicOn ? '已开启' : '已关闭'}</div>
        <div>媒体流: {mediaStream ? '已获取' : '无'}</div>
        <div>视频元素: {videoRef.current ? '存在' : '不存在'}</div>
      </div>
    </Card>
  );
};

export default VideoPreview;