export type PlayStatus = 'playing' | 'paused' | 'stopped';


export interface PlayButtonProps {
  status: PlayStatus; 
  onPlay: () => void; 
  onPause: () => void; 
  onStop: () => void;
  videoSrc?: string;
  isPlayEnded: boolean;
};

export interface PlaybackVideoItem {
  id: string; // 唯一标识
  title: string; // 视频标题
  url: string; // 播放地址
  duration: number; // 视频时长（秒），可选
  createTime?: string; // 录制时间，可选
  isLocalRecord?: boolean;
  hashid?: string; // 后端视频的hashid，用于下载链接
}

export interface PlaybackListProps {
  videoList: PlaybackVideoItem[]; // 回放列表数据
  selectedVideoId: string | null; // 选中的视频ID
  onVideoSelect: (video: PlaybackVideoItem) => void; // 选中视频的回调
  loading?: boolean; // 列表加载状态
}