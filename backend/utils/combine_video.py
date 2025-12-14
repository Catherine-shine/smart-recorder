import ffmpeg
import os

def combine_video_with_subtitle(video_path, subtitle_path, output_path):
    """
    将字幕烧录到视频中
    
    Args:
        video_path: 原始视频路径
        subtitle_path: 字幕文件路径 (.vtt 或 .srt)
        output_path: 输出视频路径
    """
    try:
        # 转换为绝对路径
        video_path = os.path.abspath(video_path)
        subtitle_path = os.path.abspath(subtitle_path)
        output_path = os.path.abspath(output_path)

        # Windows 路径处理：将 \ 替换为 /，并将 : 转义为 \:
        # 这是为了满足 FFmpeg filter 语法的要求
        # 例如 C:\Users\Lu... -> C\:/Users/Lu...
        filter_subtitle_path = subtitle_path.replace('\\', '/').replace(':', '\\:')

        print(f"正在合并视频和字幕...")
        print(f"视频源: {video_path}")
        print(f"字幕源: {subtitle_path}")
        
        # 使用 ffmpeg-python 构建流
        # input: 输入视频
        # vf: 视频滤镜，使用 subtitles 滤镜加载字幕文件
        # output: 输出文件，覆盖已存在文件
        # run: 执行命令
        (
            ffmpeg
            .input(video_path)
            .filter('subtitles', filter_subtitle_path)
            .output(output_path)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
            
        print("视频字幕合并完成")
        return True

    except ffmpeg.Error as e:
        print(f"FFmpeg 错误: {e.stderr.decode('utf8')}")
        return False
    except Exception as e:
        print(f"合并视频出错: {str(e)}")
        return False


def combine_video_with_audio(video_path, audio_path, output_path):
    """
    将音频合并到视频中
    
    Args:
        video_path: 原始视频路径
        audio_path: 音频文件路径 (.mp3, .wav 等)
        output_path: 输出视频路径
    """
    try:
        # 转换为绝对路径
        video_path = os.path.abspath(video_path)
        audio_path = os.path.abspath(audio_path)
        output_path = os.path.abspath(output_path)

        print(f"正在合并视频和音频...")
        print(f"视频源: {video_path}")
        print(f"音频源: {audio_path}")
        
        # 使用 ffmpeg-python 构建流
        # input: 输入视频和音频
        # output: 输出文件，覆盖已存在文件
        # run: 执行命令
        (
            ffmpeg
            .input(video_path)
            .input(audio_path)
            .output(output_path, vcodec='copy', acodec='aac', strict='experimental')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
            
        print("视频音频合并完成")
        return True

    except ffmpeg.Error as e:
        print(f"FFmpeg 错误: {e.stderr.decode('utf8')}")
        return False
    except Exception as e:
        print(f"合并视频出错: {str(e)}")
        return False