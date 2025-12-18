"""
录制文件上传和处理模块 - 简化版

核心功能：
1. 接收前端上传的录屏文件（必须）、音频文件（可选）、摄像头文件（可选）
2. 使用 Whisper 生成字幕
3. 可选：将音频合并到视频中生成带字幕的视频
"""
from flask import Blueprint, request, jsonify, send_file, current_app
from dao.database import get_db_connection
from utils.subtitle import generate_vtt
from utils.combine_video import combine_video_with_subtitle, combine_video_with_audio
import os
import hashlib
import time
import json
import ffmpeg

# 创建蓝图
bp = Blueprint('recordings', __name__)

# 上传目录路径
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')


def get_file_duration(file_path):
    """
    获取媒体文件的持续时间（毫秒）- 使用 ffmpeg-python
    """
    if not os.path.exists(file_path):
        raise Exception(f'文件不存在: {file_path}')
    
    if os.path.getsize(file_path) == 0:
        raise Exception(f'文件为空: {file_path}')
    
    try:
        probe = ffmpeg.probe(file_path)
        duration_str = probe.get('format', {}).get('duration')
        if duration_str:
            return float(duration_str) * 1000
        
        # 备用：从 streams 中获取时长
        for stream in probe.get('streams', []):
            if 'duration' in stream:
                return float(stream['duration']) * 1000
        
        raise Exception('无法获取文件时长')
    except ffmpeg.Error as e:
        raise Exception(f'获取文件时长失败: {e}')


@bp.route('/recordings', methods=['POST'])
def upload_recording():
    """
    上传录制文件
    
    必须参数：
    - screen_recording: 录屏文件 (webm)
    
    可选参数：
    - audio: 音频文件 (webm)
    - webcam_recording: 摄像头录制文件 (webm)
    - total_duration: 总时长（毫秒），如果不传则从录屏文件获取
    """
    # 1. 检查必须的录屏文件
    if 'screen_recording' not in request.files:
        return jsonify({'error': '缺少录屏文件'}), 400

    screen_recording_file = request.files['screen_recording']
    
    # 2. 生成唯一ID（使用录屏文件前4KB + 时间戳）
    chunk = screen_recording_file.read(4096)
    screen_recording_file.seek(0)
    hash_content = chunk + str(time.time()).encode('utf-8')
    hash_id = hashlib.sha256(hash_content).hexdigest()[:12]

    # 3. 检查是否已存在
    conn = get_db_connection()
    cursor = conn.cursor()
    existing = cursor.execute('SELECT * FROM recordings WHERE id = ?', (hash_id,)).fetchone()
    
    if existing:
        conn.close()
        return jsonify({'hashid': hash_id, 'message': '录音已存在'})

    # 4. 保存录屏文件
    screen_recording_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_screen.webm')
    screen_recording_file.save(screen_recording_path)
    print(f"[INFO] 录屏文件已保存: {screen_recording_path}")

    # 5. 获取总时长
    total_duration = 0
    if 'total_duration' in request.form:
        try:
            total_duration = float(request.form['total_duration'])
        except ValueError:
            pass
    
    # 如果没有传递总时长，从录屏文件获取
    if total_duration <= 0:
        try:
            total_duration = get_file_duration(screen_recording_path)
            print(f"[INFO] 从录屏文件获取时长: {total_duration}ms")
        except Exception as e:
            print(f"[WARN] 获取录屏时长失败: {e}")
            total_duration = 0

    # 6. 处理音频文件（可选）
    audio_path = None
    if 'audio' in request.files:
        audio_file = request.files['audio']
        if audio_file.filename and audio_file.filename != '':
            audio_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}.webm')
            audio_file.save(audio_path)
            print(f"[INFO] 音频文件已保存: {audio_path}")

    # 7. 处理摄像头文件（可选）
    webcam_recording_path = None
    if 'webcam_recording' in request.files:
        webcam_file = request.files['webcam_recording']
        if webcam_file.filename and webcam_file.filename != '':
            webcam_recording_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_webcam.webm')
            webcam_file.save(webcam_recording_path)
            print(f"[INFO] 摄像头文件已保存: {webcam_recording_path}")

    # 8. 生成字幕（如果有音频）
    subtitle_path = None
    if audio_path:
        subtitle_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_subtitle.vtt')
        try:
            generate_vtt(audio_path, subtitle_path)
            print(f"[INFO] 字幕文件已生成: {subtitle_path}")
        except Exception as e:
            print(f"[WARN] 生成字幕失败: {e}")
            subtitle_path = None

    # 9. 合并音频到录屏视频（如果有音频）
    final_video_path = screen_recording_path  # 默认使用原始录屏
    if audio_path:
        merged_video_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_merged.webm')
        try:
            success = combine_video_with_audio(screen_recording_path, audio_path, merged_video_path)
            if success and os.path.exists(merged_video_path):
                final_video_path = merged_video_path
                print(f"[INFO] 音频已合并到视频: {final_video_path}")
            else:
                print(f"[WARN] 合并音频失败，使用原始录屏")
        except Exception as e:
            print(f"[WARN] 合并音频失败: {e}，使用原始录屏")

    # 10. 保存元数据（状态变化记录，仅用于前端参考）
    trajectory_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}.json')
    trajectory_data = {}
    
    if 'audio_state_changes' in request.form:
        try:
            trajectory_data['audioStateChanges'] = json.loads(request.form['audio_state_changes'])
        except json.JSONDecodeError:
            pass
    
    if 'camera_state_changes' in request.form:
        try:
            trajectory_data['cameraStateChanges'] = json.loads(request.form['camera_state_changes'])
        except json.JSONDecodeError:
            pass
    
    with open(trajectory_path, 'w', encoding='utf-8') as f:
        json.dump(trajectory_data, f, ensure_ascii=False, indent=2)

    # 11. 保存到数据库（使用合并后的视频路径）
    cursor.execute(
        '''INSERT INTO recordings 
           (id, trajectory_path, audio_path, screen_recording_path, webcam_recording_path, subtitle_path, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (hash_id, trajectory_path, audio_path, final_video_path, webcam_recording_path, subtitle_path, int(time.time() * 1000))
    )
    
    # 同时创建 recording_sessions 记录（用于存储时长）
    cursor.execute(
        '''INSERT INTO recording_sessions 
           (session_id, created_at, status, total_duration) 
           VALUES (?, ?, ?, ?)''',
        (hash_id, int(time.time() * 1000), 'completed', total_duration)
    )
    
    # 更新 recordings 表的 session_id
    cursor.execute(
        'UPDATE recordings SET session_id = ? WHERE id = ?',
        (hash_id, hash_id)
    )

    conn.commit()
    conn.close()

    print(f"[INFO] 上传完成, hashid: {hash_id}")
    return jsonify({'hashid': hash_id, 'message': '上传成功'})


@bp.route('/recordings/<hashid>', methods=['GET'])
def get_recording(hashid):
    """
    获取录制详情
    """
    conn = get_db_connection()
    recording = conn.execute('''
        SELECT r.*, rs.total_duration
        FROM recordings r
        LEFT JOIN recording_sessions rs ON r.session_id = rs.session_id
        WHERE r.id = ?
    ''', (hashid,)).fetchone()
    conn.close()

    if not recording:
        return jsonify({'error': '未找到录音'}), 404

    # 读取轨迹文件内容
    trajectory_content = {}
    if recording['trajectory_path'] and os.path.exists(recording['trajectory_path']):
        try:
            with open(recording['trajectory_path'], 'r', encoding='utf-8') as f:
                trajectory_content = json.load(f)
        except:
            pass

    # 安全获取可能不存在的字段
    subtitled_video_path = None
    try:
        subtitled_video_path = recording['subtitled_video_path']
    except (KeyError, IndexError):
        pass

    return jsonify({
        'hashid': recording['id'],
        'trajectory': trajectory_content,
        'audioUrl': f'/api/recordings/{hashid}/audio' if recording['audio_path'] else None,
        'screenRecordingUrl': f'/api/recordings/{hashid}/screen' if recording['screen_recording_path'] else None,
        'webcamRecordingUrl': f'/api/recordings/{hashid}/webcam' if recording['webcam_recording_path'] else None,
        'subtitleUrl': f'/api/recordings/{hashid}/subtitle' if recording['subtitle_path'] else None,
        'subtitledVideoUrl': f'/api/recordings/{hashid}/subtitled-video' if subtitled_video_path else None,
        'createdAt': recording['created_at'],
        'duration': recording['total_duration'] / 1000 if recording['total_duration'] else 0
    })


@bp.route('/recordings/<hashid>/audio', methods=['GET'])
def get_audio(hashid):
    """
    获取音频文件
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT audio_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['audio_path']:
        return jsonify({'error': '未找到音频文件'}), 404

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
    获取带字幕的视频（懒生成）
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT * FROM recordings WHERE id = ?', (hashid,)).fetchone()
    
    if not recording:
        conn.close()
        return jsonify({'error': '未找到录音'}), 404

    # 如果已经有带字幕的视频，直接返回
    if recording['subtitled_video_path'] and os.path.exists(recording['subtitled_video_path']):
        conn.close()
        return send_file(recording['subtitled_video_path'], mimetype='video/webm')

    # 检查是否有字幕文件
    if not recording['subtitle_path'] or not os.path.exists(recording['subtitle_path']):
        conn.close()
        return jsonify({'error': '没有字幕文件，无法生成带字幕的视频'}), 400

    # 检查是否有录屏文件
    if not recording['screen_recording_path'] or not os.path.exists(recording['screen_recording_path']):
        conn.close()
        return jsonify({'error': '没有录屏文件'}), 400

    # 生成带字幕的视频
    subtitled_video_path = os.path.join(UPLOAD_FOLDER, f'{hashid}_subtitled.webm')
    
    try:
        # 如果有音频，先合并音频
        if recording['audio_path'] and os.path.exists(recording['audio_path']):
            temp_with_audio = os.path.join(UPLOAD_FOLDER, f'{hashid}_temp_with_audio.webm')
            combine_video_with_audio(recording['screen_recording_path'], recording['audio_path'], temp_with_audio)
            
            # 再添加字幕
            combine_video_with_subtitle(temp_with_audio, recording['subtitle_path'], subtitled_video_path)
            
            # 删除临时文件
            if os.path.exists(temp_with_audio):
                os.unlink(temp_with_audio)
        else:
            # 直接添加字幕
            combine_video_with_subtitle(recording['screen_recording_path'], recording['subtitle_path'], subtitled_video_path)
        
        # 更新数据库
        cursor = conn.cursor()
        cursor.execute('UPDATE recordings SET subtitled_video_path = ? WHERE id = ?', (subtitled_video_path, hashid))
        conn.commit()
        conn.close()
        
        return send_file(subtitled_video_path, mimetype='video/webm')
    except Exception as e:
        conn.close()
        return jsonify({'error': f'生成带字幕视频失败: {str(e)}'}), 500


@bp.route('/recordings/<hashid>/download', methods=['GET'])
def download_recording(hashid):
    """
    下载录制文件（打包成zip）
    """
    import zipfile
    import tempfile
    
    conn = get_db_connection()
    recording = conn.execute('SELECT * FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording:
        return jsonify({'error': '未找到录音'}), 404

    # 创建临时zip文件
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    
    with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zf:
        # 添加录屏文件
        if recording['screen_recording_path'] and os.path.exists(recording['screen_recording_path']):
            zf.write(recording['screen_recording_path'], f'{hashid}_screen.webm')
        
        # 添加音频文件
        if recording['audio_path'] and os.path.exists(recording['audio_path']):
            zf.write(recording['audio_path'], f'{hashid}_audio.webm')
        
        # 添加摄像头文件
        if recording['webcam_recording_path'] and os.path.exists(recording['webcam_recording_path']):
            zf.write(recording['webcam_recording_path'], f'{hashid}_webcam.webm')
        
        # 添加字幕文件
        if recording['subtitle_path'] and os.path.exists(recording['subtitle_path']):
            zf.write(recording['subtitle_path'], f'{hashid}_subtitle.vtt')

    return send_file(
        temp_zip.name,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'recording_{hashid}.zip'
    )
