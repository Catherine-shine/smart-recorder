/** 录制ID类型 */
export type RecordingHashed = string;

/** 初始化录制会话的响应 */
export interface InitRecordingSessionResponse {
  session_id: string; // 录制会话ID
}

/** 上传录制数据的请求参数（FormData） */
export interface RecordingUploadForm {
  audio?: File; // 音频文件（可选，后端会根据需要生成空白音频）
  trajectory: File; // 轨迹JSON文件（必传）
  screen_recording?: File; // 录屏文件（可选）
  webcam_recording?: File; // 摄像头录制文件（可选）
  audio_state_changes?: Array<{ timestamp: number; isEnabled: boolean }>; // 音频状态变化记录
  camera_state_changes?: Array<{ timestamp: number; isEnabled: boolean }>; // 摄像头状态变化记录
}

/** 上传录制数据的响应 */
export interface RecordingUploadResponse {
  hashid: RecordingHashed; // 录制唯一ID
}

/** 录制详情响应 */
export interface RecordingDetailResponse {
  hashid: RecordingHashed;
  trajectory: string; // 轨迹数据内容（JSON字符串）
  audioUrl: string; // 音频下载链接
  screenRecordingUrl: string | null; // 录屏下载链接
  webcamRecordingUrl: string | null; // 摄像头文件下载链接
  subtitledVideoUrl: string | null; // 带字幕视频下载链接
  subtitleUrl: string; // 字幕下载链接
  createdAt: number; // 创建时间戳（毫秒）
}

/** 录制列表项响应 */
export interface RecordingListItem {
  hashid: RecordingHashed; // 录制唯一ID
  created_at: number; // 创建时间戳（毫秒）
  duration: number; // 视频时长（秒）
  hasScreenRecording?: boolean; // 是否有屏幕录制
  hasWebcamRecording?: boolean; // 是否有摄像头录制
  hasSubtitle?: boolean; // 是否有字幕
}

/** 完成录制会话的响应 */
export interface CompleteRecordingSessionResponse {
  hashid: RecordingHashed; // 录制唯一ID
}

/** 下载文件的响应类型（Blob） */
export type DownloadFileResponse = Blob;