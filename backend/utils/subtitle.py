import whisper
import os
import datetime

def format_timestamp(seconds: float):
    """
    将秒数转换为 VTT 时间戳格式 (HH:MM:SS.mmm)
    """
    td = datetime.timedelta(seconds=seconds)
    # 获取总秒数并转换为整数部分
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    millis = int(td.microseconds / 1000)
    
    return f"{hours:02}:{minutes:02}:{secs:02}.{millis:03}"

def generate_vtt(audio_path: str, output_path: str, model_size: str = "base"):
    """
    使用 Whisper 生成 VTT 字幕文件
    
    Args:
        audio_path: 音频文件路径
        output_path: 输出 VTT 文件路径
        model_size: Whisper 模型大小 (tiny, base, small, medium, large)
    """
    try:
        print(f"正在加载 Whisper 模型: {model_size}...")
        model = whisper.load_model(model_size)
        
        print(f"正在转录 {audio_path}...")
        result = model.transcribe(audio_path)
        
        print(f"正在写入 VTT 字幕到 {output_path}...")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for segment in result["segments"]:
                start = format_timestamp(segment["start"])
                end = format_timestamp(segment["end"])
                text = segment["text"].strip()
                f.write(f"{start} --> {end}\n{text}\n\n")
                
        return True
    except Exception as e:
        print(f"生成字幕出错: {str(e)}")
        # 即使失败也不要抛出异常中断主流程，返回 False 即可
        return False
