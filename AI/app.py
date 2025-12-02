# backend/app.py
import os
import json
import tempfile
import webvtt
from datetime import timedelta
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import whisper  # Whisper（OpenAI语音识别模型）
import moviepy.editor as mp
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 配置
app.config['UPLOAD_FOLDER'] = './uploads'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB
app.config['ALLOWED_EXTENSIONS'] = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'mp3', 'wav'}

# 初始化Whisper模型
print("正在加载Whisper模型...")
model = whisper.load_model("base")  # 根据需求调整模型大小
print("模型加载完成")


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def extract_audio_from_video(video_path, audio_path):
    """从视频提取音频"""
    try:
        video = mp.VideoFileClip(video_path)
        audio = video.audio
        audio.write_audiofile(audio_path, logger=None)
        video.close()
        return True
    except Exception as e:
        print(f"提取音频失败: {e}")
        return False


def transcribe_with_timestamps(audio_path):
    """使用Whisper进行语音识别并获取时间戳"""
    try:
        # 使用Whisper进行识别，返回带时间戳的结果
        result = model.transcribe(
            audio_path,
            task="transcribe",
            language="zh",  # 中文，可根据需要修改
            verbose=True,
            word_timestamps=True  # 获取单词级时间戳
        )

        # 格式化字幕数据
        subtitles = []
        for segment in result['segments']:
            subtitles.append({
                'id': len(subtitles) + 1,
                'start': segment['start'],
                'end': segment['end'],
                'text': segment['text'].strip()
            })

        return subtitles
    except Exception as e:
        print(f"语音识别失败: {e}")
        return None


def create_webvtt(subtitles, output_path):
    """创建WebVTT字幕文件"""
    try:
        vtt = webvtt.WebVTT()

        for subtitle in subtitles:
            caption = webvtt.Caption(
                str(timedelta(seconds=subtitle['start']))[:12],
                str(timedelta(seconds=subtitle['end']))[:12],
                subtitle['text']
            )
            vtt.captions.append(caption)

        vtt.save(output_path)
        return True
    except Exception as e:
        print(f"创建WebVTT文件失败: {e}")
        return False


def create_srt(subtitles, output_path):
    """创建SRT字幕文件"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, subtitle in enumerate(subtitles, 1):
                # 格式化时间
                start_time = timedelta(seconds=subtitle['start'])
                end_time = timedelta(seconds=subtitle['end'])

                # 格式: 00:00:01,000 --> 00:00:04,000
                start_str = str(start_time).split('.')[0] + ',' + str(start_time.microseconds)[:3].ljust(3, '0')
                end_str = str(end_time).split('.')[0] + ',' + str(end_time.microseconds)[:3].ljust(3, '0')

                f.write(f"{i}\n")
                f.write(f"{start_str} --> {end_str}\n")
                f.write(f"{subtitle['text']}\n\n")

        return True
    except Exception as e:
        print(f"创建SRT文件失败: {e}")
        return False


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model': 'whisper-base'})


@app.route('/api/upload', methods=['POST'])
def upload_video():
    """上传视频文件"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有文件上传'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '未选择文件'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': '不支持的文件格式'}), 400

        # 创建上传目录
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

        # 保存文件
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        return jsonify({
            'success': True,
            'filename': filename,
            'message': '文件上传成功'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/transcribe', methods=['POST'])
def transcribe_video():
    """转录视频为字幕"""
    try:
        data = request.get_json()
        filename = data.get('filename')

        if not filename:
            return jsonify({'error': '未提供文件名'}), 400

        video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if not os.path.exists(video_path):
            return jsonify({'error': '文件不存在'}), 404

        # 创建临时文件
        with tempfile.TemporaryDirectory() as temp_dir:
            # 提取音频
            audio_path = os.path.join(temp_dir, 'audio.wav')
            if not extract_audio_from_video(video_path, audio_path):
                return jsonify({'error': '音频提取失败'}), 500

            # 语音识别
            subtitles = transcribe_with_timestamps(audio_path)
            if not subtitles:
                return jsonify({'error': '语音识别失败'}), 500

            # 创建字幕文件
            base_name = os.path.splitext(filename)[0]
            vtt_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{base_name}.vtt')
            srt_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{base_name}.srt')

            if create_webvtt(subtitles, vtt_path) and create_srt(subtitles, srt_path):
                return jsonify({
                    'success': True,
                    'subtitles': subtitles,
                    'vtt_url': f'/api/subtitle/{base_name}.vtt',
                    'srt_url': f'/api/subtitle/{base_name}.srt',
                    'video_url': f'/api/video/{filename}',
                    'total_segments': len(subtitles)
                })
            else:
                return jsonify({'error': '字幕文件创建失败'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/subtitle/<filename>', methods=['GET'])
def get_subtitle(filename):
    """获取字幕文件"""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if not os.path.exists(filepath):
            return jsonify({'error': '字幕文件不存在'}), 404

        return send_file(filepath, mimetype='text/vtt')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/video/<filename>', methods=['GET'])
def get_video(filename):
    """获取视频文件"""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if not os.path.exists(filepath):
            return jsonify({'error': '视频文件不存在'}), 404

        return send_file(filepath)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cleanup', methods=['POST'])
def cleanup_files():
    """清理上传的文件"""
    try:
        import shutil
        if os.path.exists(app.config['UPLOAD_FOLDER']):
            shutil.rmtree(app.config['UPLOAD_FOLDER'])
            os.makedirs(app.config['UPLOAD_FOLDER'])

        return jsonify({'success': True, 'message': '清理完成'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # 确保上传目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)