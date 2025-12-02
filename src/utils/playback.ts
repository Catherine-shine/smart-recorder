  export const formatDuration = (seconds?: number) => {//second 参数是可选的,调用函数时可以不传递该参数。
    if (!seconds) return '未知时长';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;//在秒数的开头填充字符0，直到字符串达到2位数
  };