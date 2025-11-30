  export const formatDuration = (seconds?: number) => {
    if (!seconds) return '未知时长';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };