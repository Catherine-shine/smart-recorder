import React, { useEffect, useState } from 'react';
import { Dropdown, Button } from 'antd';
import { DownOutlined, CheckOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setSelectedAudioDeviceId, setSelectedVideoDeviceId } from '../../../store/slices/mediastreamSlice';

interface DeviceSelectorProps {
  type: 'audio' | 'video';
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ type }) => {
  const dispatch = useAppDispatch();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const selectedDeviceId = useAppSelector(state => 
    type === 'audio' ? state.mediastream.selectedAudioDeviceId : state.mediastream.selectedVideoDeviceId
  );

  useEffect(() => {
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const filteredDevices = allDevices.filter(device => 
          device.kind === (type === 'audio' ? 'audioinput' : 'videoinput')
        );
        setDevices(filteredDevices);
        
        // 如果没有选中设备且有可用设备，默认选中第一个
        if (!selectedDeviceId && filteredDevices.length > 0) {
           // 优先选择 default 设备
           const defaultDevice = filteredDevices.find(d => d.deviceId === 'default') || filteredDevices[0];
           if (type === 'audio') {
             dispatch(setSelectedAudioDeviceId(defaultDevice.deviceId));
           } else {
             dispatch(setSelectedVideoDeviceId(defaultDevice.deviceId));
           }
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, [type, dispatch]); 

  const handleMenuClick = (e: any) => {
    if (type === 'audio') {
      dispatch(setSelectedAudioDeviceId(e.key));
    } else {
      dispatch(setSelectedVideoDeviceId(e.key));
    }
  };

  const menuItems = devices.map(device => ({
    key: device.deviceId,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 150 }}>
        <span>{device.label || `Device ${device.deviceId.slice(0, 8)}...`}</span>
        {selectedDeviceId === device.deviceId && <CheckOutlined />}
      </div>
    ),
  }));

  return (
    <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
      <Button 
        size="small" 
        type="text"
        icon={<DownOutlined style={{ fontSize: '10px' }} />} 
        style={{ 
            width: '16px', 
            height: '32px', 
            marginLeft: 0, 
            borderTopLeftRadius: 0, 
            borderBottomLeftRadius: 0,
            padding: 0,
            backgroundColor: 'rgba(0,0,0,0.05)'
        }}
      />
    </Dropdown>
  );
};

export default DeviceSelector;
