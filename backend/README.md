# smart-recorder 后端

## 后端存储的数据

- 绘画轨迹点位 `.json` 
- 录制的音频文件 `.webm`
- 浏览器的屏幕录制视频文件 `.webm`
- 前置摄像头录像 `.webm`

- 音频文件 -> 字幕文件 `.vtt`

## 安装依赖

### FFmpeg

```bash
sudo apt install ffmpeg
```

```powershell
choco install ffmpeg-full
```

### Python 依赖
```bash
uv sync
```

