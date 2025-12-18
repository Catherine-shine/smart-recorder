import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { Button, Tooltip } from 'antd';
import { FontSizeOutlined } from '@ant-design/icons';
import './index.css';

interface SubtitleCue {
  startTime: number; // 秒
  endTime: number;   // 秒
  text: string;
}

interface SubtitleOverlayProps {
  videoRef?: React.RefObject<HTMLVideoElement>;
  visible?: boolean;
  onToggle?: (visible: boolean) => void;
}

/**
 * 解析 VTT 时间戳为秒数
 * 格式: HH:MM:SS.mmm 或 MM:SS.mmm
 */
function parseVTTTime(timeStr: string): number {
  const parts = timeStr.split(':');
  let hours = 0, minutes = 0, seconds = 0;
  
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  }
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 解析 VTT 字幕文件内容
 */
function parseVTT(vttContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = vttContent.split('\n');
  
  let i = 0;
  // 跳过 WEBVTT 头部
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // 查找时间行 (包含 -->)
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const startTime = parseVTTTime(startStr);
      const endTime = parseVTTTime(endStr);
      
      // 收集字幕文本（可能有多行）
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
        textLines.push(lines[i].trim());
        i++;
      }
      
      if (textLines.length > 0) {
        cues.push({
          startTime,
          endTime,
          text: textLines.join('\n')
        });
      }
    } else {
      i++;
    }
  }
  
  return cues;
}

const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ 
  videoRef,
  visible = true,
  onToggle
}) => {
  const { subtitleUrl } = useSelector((state: RootState) => state.playback);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [currentCue, setCurrentCue] = useState<SubtitleCue | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const animationFrameRef = useRef<number>();

  // 加载并解析字幕文件
  useEffect(() => {
    if (!subtitleUrl) {
      setCues([]);
      return;
    }

    const fetchSubtitle = async () => {
      try {
        // 构建完整URL
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const fullUrl = subtitleUrl.startsWith('/') ? `${baseUrl.replace('/api', '')}${subtitleUrl}` : subtitleUrl;
        
        console.log('[SubtitleOverlay] 加载字幕:', fullUrl);
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const vttContent = await response.text();
        const parsedCues = parseVTT(vttContent);
        console.log('[SubtitleOverlay] 解析到字幕条数:', parsedCues.length);
        setCues(parsedCues);
      } catch (error) {
        console.error('[SubtitleOverlay] 加载字幕失败:', error);
        setCues([]);
      }
    };

    fetchSubtitle();
  }, [subtitleUrl]);

  // 根据视频时间更新当前字幕
  const updateCurrentCue = useCallback(() => {
    if (!videoRef?.current || cues.length === 0) {
      return;
    }

    const currentTime = videoRef.current.currentTime;
    
    // 查找当前时间对应的字幕
    const cue = cues.find(c => currentTime >= c.startTime && currentTime <= c.endTime);
    setCurrentCue(cue || null);
    
    // 继续下一帧更新
    animationFrameRef.current = requestAnimationFrame(updateCurrentCue);
  }, [videoRef, cues]);

  // 启动字幕更新循环
  useEffect(() => {
    if (isEnabled && cues.length > 0) {
      animationFrameRef.current = requestAnimationFrame(updateCurrentCue);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isEnabled, cues, updateCurrentCue]);

  // 切换字幕开关
  const handleToggle = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    onToggle?.(newEnabled);
  };

  // 如果没有字幕URL，不渲染
  if (!subtitleUrl) {
    return null;
  }

  return (
    <>
      {/* 字幕开关按钮 */}
      <Tooltip title={isEnabled ? '关闭字幕' : '开启字幕'}>
        <Button
          className="subtitle-toggle-btn"
          type={isEnabled ? 'primary' : 'default'}
          icon={<FontSizeOutlined />}
          onClick={handleToggle}
          size="small"
        />
      </Tooltip>
      
      {/* 字幕显示区域 */}
      {isEnabled && visible && currentCue && (
        <div className="subtitle-overlay">
          <div className="subtitle-text">
            {currentCue.text}
          </div>
        </div>
      )}
    </>
  );
};

export default SubtitleOverlay;
