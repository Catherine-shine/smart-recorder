import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  endRecording,
  selectRecordingStatus,
  selectStartTimestamp,
  selectCollectedData,
} from '../../store/slices/recordingSlice';
import { RECORDING_STATUS } from '../../types/common';
import {
  type RecordingModuleEventDetail,
  type RecordingComposeEventDetail,
} from '../../types/recording/controlPanel';

// 自定义Hook：全局录制流程调度
export const useRecordingScheduler = () => {
  const dispatch: AppDispatch = useDispatch();
  const recordingStatus = useSelector((state: RootState) => selectRecordingStatus(state));
  const startTimestamp = useSelector((state: RootState) => selectStartTimestamp(state));
  const collectedData = useSelector((state: RootState) => selectCollectedData(state));

  // 开始录制
  const handleStart = (): void => {
    if (recordingStatus !== RECORDING_STATUS.NOT_RECORDING) return;
    dispatch(startRecording());
    triggerModuleEvent('start', { startTimestamp: startTimestamp ?? undefined });
  };

  // 暂停录制
  const handlePause = (): void => {
    if (recordingStatus !== RECORDING_STATUS.RECORDING) return;
    dispatch(pauseRecording());
    triggerModuleEvent('pause');
  };

  // 恢复录制
  const handleResume = (): void => {
    if (recordingStatus !== RECORDING_STATUS.PAUSED) return;
    dispatch(resumeRecording());
    triggerModuleEvent('resume');
  };

  // 结束录制
  const handleEnd = (): void => {
    if (recordingStatus === RECORDING_STATUS.NOT_RECORDING) return;
    dispatch(endRecording());
    triggerModuleEvent('end');

    // 打包数据
    const packagedData: RecordingComposeEventDetail = {
      startTimestamp,
      collectedData,
    };

    // 传递给合成模块
    triggerComposerEvent(packagedData);
  };

  // 触发模块状态变更事件
  const triggerModuleEvent = (
    status: 'start' | 'pause' | 'resume' | 'end',
    payload: RecordingModuleEventDetail = {}
  ): void => {
    window.dispatchEvent(
      new CustomEvent(`recording:${status}`, { detail: payload })
    );
  };

  // 触发合成模块事件
  const triggerComposerEvent = (data: RecordingComposeEventDetail): void => {
    window.dispatchEvent(
      new CustomEvent('recording:compose', { detail: data })
    );
    console.log('已传递数据给视频合成模块：', data);
  };

  return {
    recordingStatus,
    handleStart,
    handlePause,
    handleResume,
    handleEnd,
  };
};

// Hook返回类型导出
export type RecordingSchedulerReturn = ReturnType<typeof useRecordingScheduler>;