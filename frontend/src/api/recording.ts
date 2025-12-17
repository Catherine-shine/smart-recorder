import request from './request';
import type {
  RecordingHashed,
  RecordingUploadForm,
  RecordingUploadResponse,
  RecordingDetailResponse,
  DownloadFileResponse,
  RecordingListItem,
  InitRecordingSessionResponse,
  CompleteRecordingSessionResponse,
} from '../types/api/apiTypes';
import type { PlaybackVideoItem } from '../types/playback/playbackbody';

// 联调专用：新增日志打印函数
const logApi = (api: string, params: any, res: any, err?: any) => {
  console.log(`[API联调] ${api}`, {
    参数: params,
    响应: res,
    错误: err,
  });
};

/**
 * 初始化录制会话
 */
export const initRecordingSession = async (): Promise<InitRecordingSessionResponse> => {
  return request.post('/recordings/sessions');
};

/**
 * 上传分段媒体数据
 * @param sessionId 会话ID
 * @param segmentData 分段数据
 */
export const uploadRecordingSegment = async (sessionId: string, segmentData: any) => {
  return request.post(`/recordings/sessions/${sessionId}/segments`, segmentData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 60000 // 1分钟超时
  });
};

/**
 * 完成录制会话
 * @param sessionId 会话ID
 * @param metadata 元数据
 */
export const completeRecordingSession = async (sessionId: string, metadata?: any): Promise<CompleteRecordingSessionResponse> => {
  return request.post(`/recordings/sessions/${sessionId}/complete`, metadata);
};

/**
 * 上传录制数据（生成字幕+合并视频）
 * @param formData 上传的表单数据
 * @returns 录制ID
 */
export const uploadRecording = async (form: RecordingUploadForm): Promise<RecordingUploadResponse> => {
  // 构建FormData（适配文件上传）
  const formData = new FormData();
  if (form.audio) {
    formData.append('audio', form.audio);
  }
  // 轨迹文件不再上传
  // if (form.trajectory) {
  //   formData.append('trajectory', form.trajectory);
  // }
  
  // 录屏文件必传
  formData.append('screen_recording', form.screen_recording);
  
  if (form.webcam_recording) {
    formData.append('webcam_recording', form.webcam_recording);
  }
  
  // 添加设备状态变化记录
  if (form.audio_state_changes) {
    formData.append('audio_state_changes', JSON.stringify(form.audio_state_changes));
  }
  if (form.camera_state_changes) {
    formData.append('camera_state_changes', JSON.stringify(form.camera_state_changes));
  }
  // 添加录制总时长
  if (form.total_duration !== undefined && form.total_duration !== null) {
    formData.append('total_duration', form.total_duration.toString());
  }

  return request.post('/recordings', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // 文件上传需指定此类型
    },
    timeout: 60000 // 1分钟超时
  });
};


/**
 * 获取录制详情
 * @param hashed 录制ID
 * @returns 录制完整信息
 */
export const getRecordingDetail = async (hashed: RecordingHashed): Promise<RecordingDetailResponse> => {
  console.log('=== 开始获取录制详情 ===', hashed);
  const startTime = Date.now();
  
  try {
    // 响应拦截器会自动返回response.data（非blob类型）
    const recordingDetail = await request.get(`/recordings/${hashed}`) as RecordingDetailResponse;
    console.log('=== 录制详情获取完成 ===', hashed, '耗时:', Date.now() - startTime, 'ms');
    console.log('录制详情内容:', recordingDetail);
    return recordingDetail;
  } catch (error) {
    console.error('=== 获取录制详情失败 ===', hashed, '错误:', error);
    throw error;
  }
};

/**
 * 获取会话回放数据
 * @param sessionId 会话ID
 * @returns 会话回放数据
 */
export const getSessionPlaybackData = async (sessionId: string): Promise<any> => {
  console.log('=== 开始获取会话回放数据 ===', sessionId);
  const startTime = Date.now();
  
  try {
    const response = await request.get(`/recordings/sessions/${sessionId}/playback`);
    console.log('=== 会话回放数据获取完成 ===', sessionId, '耗时:', Date.now() - startTime, 'ms');
    return response.data;
  } catch (error) {
    console.error('=== 获取会话回放数据失败 ===', sessionId, '错误:', error);
    throw error;
  }
};

/**
 * 下载音频文件
 * @param hashed 录制ID
 * @returns 音频Blob文件
 */
export const downloadRecordingAudio = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  console.log('=== 开始下载音频文件 ===', hashed);
  console.log('=== 调用URL:', `/recordings/${hashed}/audio`);
  const startTime = Date.now();
  
  try {
    const response = await request.get(`/recordings/${hashed}/audio`, {
      responseType: 'blob', // 下载文件需指定响应类型为blob
    });
    console.log('=== 音频文件下载完成 ===', hashed, '耗时:', Date.now() - startTime, 'ms', '类型:', response.data.type, '大小:', response.data.size, '字节');
    return response.data;
  } catch (error) {
    console.error('=== 音频文件下载失败 ===', hashed, '错误:', error);
    console.error('=== 错误详情:', error instanceof Error ? error.message : error);
    console.error('=== 错误堆栈:', error instanceof Error ? error.stack : error);
    throw error;
  }
};

/**
 * 下载录屏文件
 * @param hashed 录制ID
 * @returns 录屏Blob文件
 */
export const downloadRecordingScreen = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  console.log('=== 开始下载录屏文件 ===', hashed);
  const startTime = Date.now();
  
  try {
    const response = await request.get(`/recordings/${hashed}/screen`, {
      responseType: 'blob',
    });
    console.log('=== 录屏文件下载完成 ===', hashed, '耗时:', Date.now() - startTime, 'ms', '类型:', response.data.type, '大小:', response.data.size, '字节');
    return response.data;
  } catch (error) {
    console.error('=== 录屏文件下载失败 ===', hashed, '错误:', error);
    throw error;
  }
};

/**
 * 下载摄像头录制文件
 * @param hashed 录制ID
 * @returns 摄像头Blob文件
 */
export const downloadRecordingWebcam = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  console.log('=== 开始下载摄像头文件 ===', hashed);
  const startTime = Date.now();
  
  try {
    const response = await request.get(`/recordings/${hashed}/webcam`, {
      responseType: 'blob',
    });
    console.log('=== 摄像头文件下载完成 ===', hashed, '耗时:', Date.now() - startTime, 'ms', '类型:', response.data.type, '大小:', response.data.size, '字节');
    return response.data;
  } catch (error) {
    console.error('=== 摄像头文件下载失败 ===', hashed, '错误:', error);
    throw error;
  }
};

/**
 * 下载字幕文件
 * @param hashed 录制ID
 * @returns 字幕Blob文件
 */
export const downloadRecordingSubtitle = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  const response = await request.get(`/recordings/${hashed}/subtitle`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * 下载带字幕的视频文件
 * @param hashed 录制ID
 * @returns 带字幕视频Blob文件
 */
export const downloadRecordingSubtitledVideo = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  const response = await request.get(`/recordings/${hashed}/subtitled_video`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * 获取录制轨迹数据
 * @param hashed 录制的hashid
 */
export const getRecordingTrajectory = async (hashed: RecordingHashed): Promise<PlaybackVideoItem['trajectoryData']> => {
  try {
    const trajectoryData = await request.get(`/recordings/${hashed}/trajectory`) as PlaybackVideoItem['trajectoryData'];
    console.log('轨迹数据获取完成:', trajectoryData);
    return trajectoryData;
  } catch (error) {
    console.error('获取轨迹数据失败:', error);
    return { mouse: [], whiteboard: [], audioStateChanges: [], cameraStateChanges: [] };
  }
};

/**
 * 获取录制列表
 * @returns 录制列表
 */
export const getRecordingList = async (): Promise<RecordingListItem[]> => {
  console.log('=== 开始获取录制列表 ===');
  const startTime = Date.now();
  
  try {
    // 响应拦截器会自动返回response.data（非blob类型）
    const responseData = await request.get('/recordings');
    console.log('=== 录制列表获取完成 ===', '耗时:', Date.now() - startTime, 'ms');
    console.log('API响应:', responseData);
    // 添加详细的duration字段日志
    if (Array.isArray(responseData)) {
      responseData.forEach((item, index) => {
        console.log(`第${index}个视频 - hashid: ${item.hashid}, duration: ${item.duration}, duration类型: ${typeof item.duration}`);
      });
    }
    // 确保返回的数据是RecordingListItem[]类型
    return Array.isArray(responseData) ? responseData : [];
  } catch (error) {
    console.error('=== 获取录制列表失败 ===', '错误:', error);
    throw error;
  }
};

/**
 * 清空所有录制数据
 * @returns 操作结果
 */
export const clearAllRecordings = async (): Promise<void> => {
  return request.delete('/recordings');
};

/**
 * 删除单个录制数据
 * @param hashed 录制ID
 * @returns 操作结果
 */
export const deleteRecording = async (hashed: RecordingHashed): Promise<void> => {
  return request.delete(`/recordings/${hashed}`);
};

/**
 * 下载所有录制相关文件的压缩包
 * @param hashed 录制ID
 * @returns 压缩包Blob文件
 */
export const downloadAllRecordingFiles = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  const response = await request.get(`/recordings/${hashed}/all-files`, {
    responseType: 'blob',
  });
  return response.data;
};
