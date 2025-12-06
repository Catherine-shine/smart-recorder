from flask import Blueprint, request, jsonify, send_file, current_app
from dao.database import get_db_connection
from utils.subtitle import generate_vtt
from utils.combine_video import combine_video_with_subtitle
import os
import hashlib
import time
import json

# 创建蓝图
bp = Blueprint('recordings', __name__)

# 调整 UPLOAD_FOLDER 路径，因为现在文件在 backend/routes/recordings.py
# __file__ 是 backend/routes/recordings.py
# dirname(__file__) 是 backend/routes
# dirname(dirname(__file__)) 是 backend
# 所以 uploads 目录在 backend/uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')

@bp.route('/recordings', methods=['POST'])
def upload_recording():
    """
    上传录音和轨迹文件
    """
    # 检查是否有文件
    if 'audio' not in request.files or 'trajectory' not in request.files:
        return jsonify({'error': '缺少音频或轨迹文件'}), 400

    audio_file = request.files['audio']
    trajectory_file = request.files['trajectory']

    # 读取轨迹文件内容以计算哈希
    trajectory_content = trajectory_file.read()
    # 重置文件指针以便后续保存
    trajectory_file.seek(0)
    
    # 计算 SHA256 哈希的前 12 位作为 ID
    hash_id = hashlib.sha256(trajectory_content).hexdigest()[:12]

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 检查是否已存在
    existing = cursor.execute('SELECT * FROM recordings WHERE id = ?', (hash_id,)).fetchone()
    
    if existing:
        conn.close()
        return jsonify({'hashid': hash_id, 'message': '录音已存在'})

    # 确保存储目录存在
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    # 获取文件扩展名
    audio_ext = os.path.splitext(audio_file.filename)[1] if audio_file.filename else '.webm'
    trajectory_ext = os.path.splitext(trajectory_file.filename)[1] if trajectory_file.filename else '.json'

    # 构建保存路径
    saved_audio_path = os.path.join(UPLOAD_FOLDER, f"{hash_id}{audio_ext}")
    saved_trajectory_path = os.path.join(UPLOAD_FOLDER, f"{hash_id}{trajectory_ext}")

    # 保存文件
    audio_file.save(saved_audio_path)
    trajectory_file.save(saved_trajectory_path)

    # 处理可选的录屏和摄像头文件
    screen_file = request.files.get('screen_recording')
    webcam_file = request.files.get('webcam_recording')
    
    saved_screen_path = None
    saved_webcam_path = None
    saved_subtitle_path = None

    if screen_file:
        screen_ext = os.path.splitext(screen_file.filename)[1] if screen_file.filename else '.webm'
        saved_screen_path = os.path.join(UPLOAD_FOLDER, f"{hash_id}_screen{screen_ext}")
        screen_file.save(saved_screen_path)
        
    if webcam_file:
        webcam_ext = os.path.splitext(webcam_file.filename)[1] if webcam_file.filename else '.webm'
        saved_webcam_path = os.path.join(UPLOAD_FOLDER, f"{hash_id}_webcam{webcam_ext}")
        webcam_file.save(saved_webcam_path)

    # 自动生成字幕
    saved_subtitled_video_path = None
    try:
        subtitle_path = os.path.join(UPLOAD_FOLDER, f"{hash_id}_subtitle.vtt")
        # 注意：这里是同步调用，可能会导致请求处理时间较长
        # 建议在生产环境中使用异步任务队列（如 Celery）
        if generate_vtt(saved_audio_path, subtitle_path):
            saved_subtitle_path = subtitle_path
            
            # 如果有视频文件，尝试合并字幕
            video_source = saved_screen_path
            if video_source:
                subtitled_video_path = os.path.join(UPLOAD_FOLDER, f"{hash_id}_subtitled.mp4")
                if combine_video_with_subtitle(video_source, saved_subtitle_path, subtitled_video_path):
                    saved_subtitled_video_path = subtitled_video_path

    except Exception as e:
        print(f"字幕生成或视频合并失败: {e}")

    # 插入数据库
    cursor.execute(
        '''INSERT INTO recordings (
            id, trajectory_path, audio_path, screen_recording_path, webcam_recording_path, subtitle_path, subtitled_video_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (hash_id, saved_trajectory_path, saved_audio_path, saved_screen_path, saved_webcam_path, saved_subtitle_path, saved_subtitled_video_path, int(time.time() * 1000))
    )
    conn.commit()
    conn.close()

    return jsonify({'hashid': hash_id})

@bp.route('/recordings/<hashid>', methods=['GET'])
def get_recording(hashid):
    """
    获取录音详情
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT * FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording:
        return jsonify({'error': '未找到录音'}), 404

    # 读取轨迹文件内容
    try:
        with open(recording['trajectory_path'], 'r', encoding='utf-8') as f:
            trajectory_content = json.load(f)
    except FileNotFoundError:
        return jsonify({'error': '轨迹文件丢失'}), 500

    return jsonify({
        'hashid': recording['id'],
        'trajectory': trajectory_content,
        'audioUrl': f'/api/recordings/{hashid}/audio',
        'screenRecordingUrl': f'/api/recordings/{hashid}/screen' if recording['screen_recording_path'] else None,
        'webcamRecordingUrl': f'/api/recordings/{hashid}/webcam' if recording['webcam_recording_path'] else None,
        'subtitleUrl': f'/api/recordings/{hashid}/subtitle' if recording['subtitle_path'] else None,
        'subtitledVideoUrl': f'/api/recordings/{hashid}/subtitled-video' if recording['subtitled_video_path'] else None,
        'createdAt': recording['created_at']
    })

@bp.route('/recordings/<hashid>/audio', methods=['GET'])
def get_audio(hashid):
    """
    获取音频文件
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT * FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording:
        return jsonify({'error': '未找到录音'}), 404

    if not os.path.exists(recording['audio_path']):
        return jsonify({'error': '音频文件丢失'}), 404

    return send_file(recording['audio_path'], mimetype='audio/webm')

@bp.route('/recordings/<hashid>/screen', methods=['GET'])
def get_screen_recording(hashid):
    """
    获取录屏文件
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT screen_recording_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['screen_recording_path']:
        return jsonify({'error': '未找到录屏文件'}), 404

    if not os.path.exists(recording['screen_recording_path']):
        return jsonify({'error': '录屏文件丢失'}), 404

    return send_file(recording['screen_recording_path'], mimetype='video/webm')

@bp.route('/recordings/<hashid>/webcam', methods=['GET'])
def get_webcam_recording(hashid):
    """
    获取摄像头录制文件
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT webcam_recording_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['webcam_recording_path']:
        return jsonify({'error': '未找到摄像头录制文件'}), 404

    if not os.path.exists(recording['webcam_recording_path']):
        return jsonify({'error': '摄像头录制文件丢失'}), 404

    return send_file(recording['webcam_recording_path'], mimetype='video/webm')

@bp.route('/recordings/<hashid>/subtitle', methods=['GET'])
def get_subtitle(hashid):
    """
    获取字幕文件
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT subtitle_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['subtitle_path']:
        return jsonify({'error': '未找到字幕文件'}), 404

    if not os.path.exists(recording['subtitle_path']):
        return jsonify({'error': '字幕文件丢失'}), 404

    return send_file(recording['subtitle_path'], mimetype='text/vtt')

@bp.route('/recordings/<hashid>/subtitled-video', methods=['GET'])
def get_subtitled_video(hashid):
    """
    获取已合并字幕的视频文件
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT subtitled_video_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['subtitled_video_path']:
        return jsonify({'error': '未找到带字幕的视频文件'}), 404

    if not os.path.exists(recording['subtitled_video_path']):
        return jsonify({'error': '带字幕的视频文件丢失'}), 404

    return send_file(recording['subtitled_video_path'], mimetype='video/mp4')
