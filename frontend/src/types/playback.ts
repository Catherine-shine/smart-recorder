export type PlayStatus = 'playing' | 'paused' | 'stopped';

export interface PlayButtonProps {
  status: PlayStatus; 
  onPlay: () => void; 
  onPause: () => void; 
  onStop: () => void;
  videoSrc?: string;
  isPlayEnded: boolean;
}