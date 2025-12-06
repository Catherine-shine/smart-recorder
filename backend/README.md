# smart-recorder 后端

## 后端存储的数据

- 绘画轨迹点位 `.json` 
- 录制的音频文件 `.webm`
- 浏览器的屏幕录制视频文件 `.webm`
- 前置摄像头录像 `.webm`

- 音频文件 -> 字幕文件 `.vtt`
- 字幕文件烧录到视频中 -> 带字幕的视频文件 `.mp4`

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

## API

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/recordings` | 上传录制数据，自动生成字幕并合并视频 | **Form Data**: <br> - `audio`: 音频文件 (必需) <br> - `trajectory`: 轨迹 JSON 文件 (必需) <br> - `screen_recording`: 录屏文件 (可选) <br> - `webcam_recording`: 摄像头录制文件 (可选) | **JSON**: `{ "hashid": "..." }` |
| **GET** | `/api/recordings/<hashid>` | 获取录制详情 | URL 参数 `hashid` | **JSON**: <br> - `hashid`: 录制 ID <br> - `trajectory`: 轨迹数据内容 <br> - `audioUrl`: 音频下载链接 <br> - `screenRecordingUrl`: 录屏下载链接 <br> - `webcamRecordingUrl`: 摄像头视频下载链接 <br> - `subtitleUrl`: 字幕下载链接 <br> - `subtitledVideoUrl`: 带字幕视频下载链接 <br> - `createdAt`: 创建时间戳 |
| **GET** | `/api/recordings/<hashid>/audio` | 下载音频文件 | URL 参数 `hashid` | **File**: `audio/webm` |
| **GET** | `/api/recordings/<hashid>/screen` | 下载录屏文件 | URL 参数 `hashid` | **File**: `video/webm` |
| **GET** | `/api/recordings/<hashid>/webcam` | 下载摄像头文件 | URL 参数 `hashid` | **File**: `video/webm` |
| **GET** | `/api/recordings/<hashid>/subtitle` | 下载字幕文件 | URL 参数 `hashid` | **File**: `text/vtt` |
| **GET** | `/api/recordings/<hashid>/subtitled-video` | 下载带字幕视频 | URL 参数 `hashid` | **File**: `video/mp4` |