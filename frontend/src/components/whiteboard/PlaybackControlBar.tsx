import React from 'react';
import { Button, Slider, Typography } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, CloseOutlined } from '@ant-design/icons';

interface PlaybackControlBarProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onClose?: () => void;
}

export const PlaybackControlBar: React.FC<PlaybackControlBarProps> = ({
    isPlaying,
    currentTime,
    duration,
    onPlayPause,
    onSeek,
    onClose
}) => {
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            minWidth: '300px',
            backgroundColor: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 1000
        }}>
            <Button 
                type="text" 
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
                onClick={onPlayPause}
            />
            <Typography.Text style={{ minWidth: 40 }}>{formatTime(currentTime)}</Typography.Text>
            <div style={{ flex: 1 }}>
                <Slider 
                    min={0} 
                    max={duration} 
                    value={currentTime} 
                    onChange={onSeek}
                    tooltip={{ formatter: (val) => formatTime(val || 0) }}
                />
            </div>
            <Typography.Text style={{ minWidth: 40 }}>{formatTime(duration)}</Typography.Text>
            {onClose && <Button type="text" icon={<CloseOutlined />} onClick={onClose} />}
        </div>
    );
};
