import request from './request';
import type {
  RecordingHashed,
  RecordingUploadForm,
  RecordingUploadResponse,
  RecordingDetailResponse,
  DownloadFileResponse,
  RecordingListItem,
} from '../types/api/apiTypes';

// 联调专用：新增日志打印函数
const logApi = (api: string, params: any, res: any, err?: any) => {
  console.log(`[API联调] ${api}`, {
    参数: params,
    响应: res,
    错误: err,
  });
};

/**
 * 上传录制数据（生成字幕+合并视频）
 * @param formData 上传的表单数据
 * @returns 录制ID
 */
export const uploadRecording = async (form: RecordingUploadForm): Promise<RecordingUploadResponse> => {
  // 构建FormData（适配文件上传）
  const formData = new FormData();
  formData.append('audio', form.audio);
  formData.append('trajectory', form.trajectory);
  if (form.screen_recording) {
    formData.append('screen_recording', form.screen_recording);
  }
  if (form.webcam_recording) {
    formData.append('webcam_recording', form.webcam_recording);
  }

  return request.post('/recordings', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // 文件上传需指定此类型
    },
  });
};


/**
 * 获取录制详情
 * @param hashed 录制ID
 * @returns 录制完整信息
 */
export const getRecordingDetail = async (hashed: RecordingHashed): Promise<RecordingDetailResponse> => {
  try {
    const res = await request.get(`/recordings/${hashed}`) as any; 
    logApi('getRecordingDetail', { hashed }, res);
    
    if (!res.trajectory) {
      console.warn(`[联调警告] 录制${hashed}无轨迹数据`, res);
    }
    return res as RecordingDetailResponse;
  } catch (err) {
    logApi('getRecordingDetail', { hashed }, null, err);
    throw err;
  }
};



/**
 * 下载音频文件
 * @param hashed 录制ID
 * @returns 音频Blob文件
 */
export const downloadRecordingAudio = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  return request.get(`/recordings/${hashed}/audio`, {
    responseType: 'blob', // 下载文件需指定响应类型为blob
  });
};

/**
 * 下载录屏文件
 * @param hashed 录制ID
 * @returns 录屏Blob文件
 */
export const downloadRecordingScreen = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  return request.get(`/recordings/${hashed}/screen`, {
    responseType: 'blob',
  });
};

/**
 * 下载摄像头录制文件
 * @param hashed 录制ID
 * @returns 摄像头Blob文件
 */
export const downloadRecordingWebcam = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  return request.get(`/recordings/${hashed}/webcam`, {
    responseType: 'blob',
  });
};

/**
 * 下载字幕文件
 * @param hashed 录制ID
 * @returns 字幕Blob文件
 */
export const downloadRecordingSubtitle = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  return request.get(`/recordings/${hashed}/subtitle`, {
    responseType: 'blob',
  });
};

/**
 * 下载带字幕的视频文件
 * @param hashed 录制ID
 * @returns 带字幕视频Blob文件
 */
export const downloadRecordingSubtitledVideo = async (hashed: RecordingHashed): Promise<DownloadFileResponse> => {
  return request.get(`/recordings/${hashed}/subtitled-video`, {
    responseType: 'blob',
  });
};

/**
 * 获取录制列表
 * @returns 录制列表
 */
export const getRecordingList = async (): Promise<RecordingListItem[]> => {
  try {
    const res = await request.get('/recordings'); 
    logApi('getRecordingList', {}, res);
    return request.get('/recordings');
  } catch (err) {
    logApi('getRecordingList', {}, null, err);
    throw err;
  }
};

// export const getRecordingList = async (): Promise<RecordingListItem[]> => {
//   return request.get('/recordings');
// };