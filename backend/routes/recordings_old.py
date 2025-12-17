from flask import Blueprint, request, jsonify, send_file, current_app
from dao.database import get_db_connection
from utils.subtitle import generate_vtt
from utils.combine_video import combine_video_with_subtitle, combine_video_with_audio
import os
import hashlib
import time
import json
import zipfile
import tempfile
import subprocess
import ffmpeg

# 创建蓝图
bp = Blueprint('recordings', __name__)

# 调整 UPLOAD_FOLDER 路径，因为现在文件在 backend/routes/recordings.py
# __file__ 是 backend/routes/recordings.py
# dirname(__file__) 是 backend/routes
# dirname(dirname(__file__)) 是 backend
# 所以 uploads 目录在 backend/uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')

# 确保FFmpeg可用
FFMPEG_PATH = 'ffmpeg'  # 假设FFmpeg已经安装并在PATH中

def get_file_duration(file_path):
    """
    获取媒体文件的持续时间（毫秒）- 使用 ffmpeg-python
    """
    print(f"[DEBUG] get_file_duration: 尝试获取文件时长: {file_path}")
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        raise Exception(f'文件不存在: {file_path}')
    
    # 检查文件大小
    file_size = os.path.getsize(file_path)
    print(f"[DEBUG] get_file_duration: 文件大小: {file_size} bytes")
    
    if file_size == 0:
        raise Exception(f'文件为空: {file_path}')
    
    try:
        # 使用 ffmpeg-python 获取文件信息
        probe = ffmpeg.probe(file_path)
        print(f"[DEBUG] get_file_duration: probe结果: {json.dumps(probe.get('format', {}), indent=2)}")
        
        # 从 format 中获取时长
        duration_str = probe.get('format', {}).get('duration')
        if duration_str:
            duration_seconds = float(duration_str)
            print(f"[DEBUG] get_file_duration: 成功获取时长: {duration_seconds}秒 ({duration_seconds * 1000}毫秒)")
            return duration_seconds * 1000
        
        # 备用：从 streams 中获取时长
        streams = probe.get('streams', [])
        for stream in streams:
            if 'duration' in stream:
                duration_seconds = float(stream['duration'])
                print(f"[DEBUG] get_file_duration: 从stream获取时长: {duration_seconds}秒")
                return duration_seconds * 1000
        
        raise Exception('无法从probe结果中获取时长')
        
    except ffmpeg.Error as e:
        print(f"[DEBUG] get_file_duration: ffmpeg-python错误: {e.stderr.decode() if e.stderr else str(e)}")
        raise Exception(f'获取文件时长失败: {e}')

def process_recording(session_id):
    """
    处理录制会话的所有分段数据，合成为完整的视频和音频文件
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取该会话的所有分段
    cursor.execute(
        'SELECT segment_type, start_time, end_time, file_path FROM recording_segments WHERE session_id = ? ORDER BY segment_type, start_time',
        (session_id,)
    )
    segments = cursor.fetchall()
    
    if not segments:
        conn.close()
        raise Exception('没有找到任何分段数据')
    
    # 分离不同类型的分段
    screen_segments = []
    camera_segments = []
    audio_segments = []
    
    for segment in segments:
        segment_type, start_time, end_time, file_path = segment
        if segment_type == 'screen':
            screen_segments.append({'start': start_time, 'end': end_time, 'path': file_path})
        elif segment_type == 'camera':
            camera_segments.append({'start': start_time, 'end': end_time, 'path': file_path})
        elif segment_type == 'audio':
            audio_segments.append({'start': start_time, 'end': end_time, 'path': file_path})
    
    # 计算总时长（以最长的结束时间为准）
    total_duration = max(
        max(seg['end'] for seg in screen_segments) if screen_segments else 0,
        max(seg['end'] for seg in camera_segments) if camera_segments else 0,
        max(seg['end'] for seg in audio_segments) if audio_segments else 0
    )
    
    if total_duration == 0:
        conn.close()
        raise Exception('总时长为0，无法合成')
    
    # 创建输出目录
    output_folder = os.path.join(UPLOAD_FOLDER, session_id, 'output')
    os.makedirs(output_folder, exist_ok=True)
    
    # 合成屏幕视频
    final_screen_path = os.path.join(output_folder, f'{session_id}_final_screen.webm')
    if screen_segments:
        # 为屏幕视频创建 concat 文件
        screen_concat_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        
        # 添加第一段
        prev_end = 0
        for i, seg in enumerate(screen_segments):
            # 如果当前分段和上一段之间有间隙，添加黑屏填充
            if i > 0 and seg['start'] > prev_end:
                # 添加黑屏视频，持续时间为间隙时长
                gap_duration = (seg['start'] - prev_end) / 1000  # 转换为秒
                # 使用FFmpeg生成黑屏视频
                black_screen_file = os.path.join(output_folder, f'black_screen_{i}.webm')
                cmd = [
                    FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=black:s=1280x720:r=30',
                    '-t', str(gap_duration), '-c:v', 'libvpx-vp9', '-b:v', '2M', '-y', black_screen_file
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                
                # 添加到concat文件
                screen_concat_file.write(f"file '{black_screen_file}'\n")
            
            # 添加当前分段
            screen_concat_file.write(f"file '{seg['path']}'\n")
            prev_end = seg['end']
        
        screen_concat_file.close()
        
        # 使用FFmpeg合并所有屏幕分段
        cmd = [
            FFMPEG_PATH, '-f', 'concat', '-safe', '0', '-i', screen_concat_file.name,
            '-c', 'copy', '-y', final_screen_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        
        # 删除临时文件
        os.unlink(screen_concat_file.name)
    else:
        # 如果没有屏幕视频，生成完整的黑屏视频
        cmd = [
            FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=black:s=1280x720:r=30',
            '-t', str(total_duration / 1000), '-c:v', 'libvpx-vp9', '-b:v', '2M', '-y', final_screen_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    
    # 合成摄像头视频
    final_camera_path = os.path.join(output_folder, f'{session_id}_final_camera.webm')
    if camera_segments:
        # 为摄像头视频创建 concat 文件
        camera_concat_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        
        # 添加第一段
        prev_end = 0
        for i, seg in enumerate(camera_segments):
            # 如果当前分段和上一段之间有间隙，添加黑屏填充
            if i > 0 and seg['start'] > prev_end:
                # 添加黑屏视频，持续时间为间隙时长
                gap_duration = (seg['start'] - prev_end) / 1000  # 转换为秒
                # 使用FFmpeg生成黑屏视频
                black_camera_file = os.path.join(output_folder, f'black_camera_{i}.webm')
                cmd = [
                    FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=black:s=320x240:r=30',
                    '-t', str(gap_duration), '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', black_camera_file
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                
                # 添加到concat文件
                camera_concat_file.write(f"file '{black_camera_file}'\n")
            
            # 添加当前分段
            camera_concat_file.write(f"file '{seg['path']}'\n")
            prev_end = seg['end']
        
        camera_concat_file.close()
        
        # 使用FFmpeg合并所有摄像头分段
        cmd = [
            FFMPEG_PATH, '-f', 'concat', '-safe', '0', '-i', camera_concat_file.name,
            '-c', 'copy', '-y', final_camera_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        
        # 删除临时文件
        os.unlink(camera_concat_file.name)
    else:
        # 如果没有摄像头视频，生成完整的黑屏视频
        cmd = [
            FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=black:s=320x240:r=30',
            '-t', str(total_duration / 1000), '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', final_camera_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    
    # 合成音频
    final_audio_path = os.path.join(output_folder, f'{session_id}_final_audio.webm')
    if audio_segments:
        # 为音频创建 concat 文件
        audio_concat_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        
        # 添加第一段
        prev_end = 0
        for i, seg in enumerate(audio_segments):
            # 如果当前分段和上一段之间有间隙，添加静音填充
            if i > 0 and seg['start'] > prev_end:
                # 添加静音音频，持续时间为间隙时长
                gap_duration = (seg['start'] - prev_end) / 1000  # 转换为秒
                # 使用FFmpeg生成静音音频
                silent_audio_file = os.path.join(output_folder, f'silent_audio_{i}.webm')
                cmd = [
                    FFMPEG_PATH, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                    '-t', str(gap_duration), '-c:a', 'libopus', '-b:a', '128k', '-y', silent_audio_file
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                
                # 添加到concat文件
                audio_concat_file.write(f"file '{silent_audio_file}'\n")
            
            # 添加当前分段
            audio_concat_file.write(f"file '{seg['path']}'\n")
            prev_end = seg['end']
        
        audio_concat_file.close()
        
        # 使用FFmpeg合并所有音频分段
        cmd = [
            FFMPEG_PATH, '-f', 'concat', '-safe', '0', '-i', audio_concat_file.name,
            '-c', 'copy', '-y', final_audio_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        
        # 删除临时文件
        os.unlink(audio_concat_file.name)
    else:
        # 如果没有音频，生成完整的静音音频
        cmd = [
            FFMPEG_PATH, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
            '-t', str(total_duration / 1000), '-c:a', 'libopus', '-b:a', '128k', '-y', final_audio_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    
    # 更新会话记录
    cursor.execute(
        'UPDATE recording_sessions SET status = ?, total_duration = ?, final_screen_path = ?, final_camera_path = ?, final_audio_path = ? WHERE session_id = ?',
        ('completed', total_duration, final_screen_path, final_camera_path, final_audio_path, session_id)
    )
    
    conn.commit()
    conn.close()
    
    return {
        'session_id': session_id,
        'total_duration': total_duration,
        'final_screen_path': final_screen_path,
        'final_camera_path': final_camera_path,
        'final_audio_path': final_audio_path
    }

@bp.route('/recordings/sessions', methods=['POST'])
def create_recording_session():
    """
    初始化录制会话
    创建一个新的录制会话ID，用于后续上传分段数据
    """
    # 生成一个唯一的会话ID
    session_id = hashlib.sha256(str(time.time() * 1000).encode()).hexdigest()[:16]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 创建会话记录
    cursor.execute(
        '''
        INSERT INTO recording_sessions (session_id, created_at, status) 
        VALUES (?, ?, ?)
        ''',
        (session_id, int(time.time() * 1000), 'active')
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'session_id': session_id, 'message': '录制会话创建成功'})

@bp.route('/recordings/sessions/<session_id>/segments', methods=['POST'])
def upload_segment(session_id):
    """
    上传分段媒体数据
    接收前端上传的分段录屏、摄像头和麦克风文件，以及相对于录屏时间的时间戳
    """
    # 检查会话是否存在且处于活跃状态
    conn = get_db_connection()
    cursor = conn.cursor()
    session = cursor.execute(
        'SELECT * FROM recording_sessions WHERE session_id = ? AND status = ?',
        (session_id, 'active')
    ).fetchone()
    
    if not session:
        conn.close()
        return jsonify({'error': '录制会话不存在或已关闭'}), 404
    
    # 检查必要的参数
    if 'segment_type' not in request.form or 'start_time' not in request.form or 'end_time' not in request.form:
        conn.close()
        return jsonify({'error': '缺少必要的参数（segment_type, start_time, end_time）'}), 400
    
    segment_type = request.form['segment_type']  # screen/camera/audio
    start_time = float(request.form['start_time'])  # 相对于录屏开始时间的开始时间（毫秒）
    end_time = float(request.form['end_time'])  # 相对于录屏开始时间的结束时间（毫秒）
    
    # 检查文件是否存在
    if segment_type not in request.files:
        conn.close()
        return jsonify({'error': f'缺少{segment_type}文件'}), 400
    
    media_file = request.files[segment_type]
    
    # 创建会话目录（如果不存在）
    session_folder = os.path.join(UPLOAD_FOLDER, session_id)
    os.makedirs(session_folder, exist_ok=True)
    
    # 生成唯一的分段文件名
    segment_filename = f'{segment_type}_{int(time.time() * 1000)}.webm'
    segment_path = os.path.join(session_folder, segment_filename)
    
    # 保存文件
    media_file.save(segment_path)
    
    # 保存分段信息到数据库
    cursor.execute(
        '''
        INSERT INTO recording_segments (session_id, segment_type, start_time, end_time, file_path)
        VALUES (?, ?, ?, ?, ?)
        ''',
        (session_id, segment_type, start_time, end_time, segment_path)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': '分段上传成功', 'segment_id': cursor.lastrowid})

@bp.route('/recordings/sessions/<session_id>/complete', methods=['POST'])
def complete_recording(session_id):
    """
    完成录制会话
    前端告知后端所有分段数据已上传完成，触发媒体合成逻辑
    """
    # 检查会话是否存在且处于活跃状态
    conn = get_db_connection()
    cursor = conn.cursor()
    session = cursor.execute(
        'SELECT * FROM recording_sessions WHERE session_id = ? AND status = ?',
        (session_id, 'active')
    ).fetchone()
    
    if not session:
        conn.close()
        return jsonify({'error': '录制会话不存在或已关闭'}), 404
    
    # 处理音频状态变化记录
    audio_state_changes = []
    if 'audio_state_changes' in request.form:
        try:
            audio_state_changes = json.loads(request.form['audio_state_changes'])
            # 确保状态变化记录按时间顺序排列
            audio_state_changes.sort(key=lambda x: x['timestamp'])
        except json.JSONDecodeError:
            print("音频状态变化记录解析失败")
    
    # 处理摄像头状态变化记录
    camera_state_changes = []
    if 'camera_state_changes' in request.form:
        try:
            camera_state_changes = json.loads(request.form['camera_state_changes'])
            # 确保状态变化记录按时间顺序排列
            camera_state_changes.sort(key=lambda x: x['timestamp'])
        except json.JSONDecodeError:
            print("摄像头状态变化记录解析失败")
    
    # 处理总时长
    total_duration = 0
    if 'total_duration' in request.form:
        try:
            total_duration = float(request.form['total_duration'])
        except ValueError:
            print("总时长解析失败")
    
    # 更新会话信息
    cursor.execute(
        'UPDATE recording_sessions SET status = ?, total_duration = ?, audio_state_changes = ?, camera_state_changes = ? WHERE session_id = ?',
        ('completed', total_duration, json.dumps(audio_state_changes), json.dumps(camera_state_changes), session_id)
    )
    
    conn.commit()
    conn.close()
    
    # 在这里可以异步触发媒体合成逻辑
    # 为了简化，我们先同步处理
    try:
        # 执行媒体合成
        result = process_recording(session_id)
        return jsonify({'message': '录制完成并合成成功', 'result': result})
    except Exception as e:
        return jsonify({'error': f'合成失败：{str(e)}'}), 500

@bp.route('/recordings', methods=['POST'])
def upload_recording():
    """
    上传录音和录屏文件
    """
    # 检查是否有录屏文件
    if 'screen_recording' not in request.files:
        return jsonify({'error': '缺少录屏文件'}), 400

    screen_recording_file = request.files['screen_recording']
    
    # 读取录屏文件前4KB内容以计算哈希（避免读取整个大文件）
    chunk = screen_recording_file.read(4096)
    screen_recording_file.seek(0)
    
    # 结合时间戳计算哈希，确保唯一性
    hash_content = chunk + str(time.time()).encode('utf-8')
    hash_id = hashlib.sha256(hash_content).hexdigest()[:12]

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 检查是否已存在
    existing = cursor.execute('SELECT * FROM recordings WHERE id = ?', (hash_id,)).fetchone()
    
    if existing:
        conn.close()
        return jsonify({'hashid': hash_id, 'message': '录音已存在'})

    # 计算录制时长
    # 优先使用前端传递的总时长
    total_duration = int(request.form.get('total_duration', 10000))  # 默认10秒
    screen_recording_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_screen.webm')
    screen_recording_file.save(screen_recording_path)
    
    # 如果没有传递总时长，尝试从文件获取
    if 'total_duration' not in request.form:
        try:
            total_duration = get_file_duration(screen_recording_path)
        except Exception as e:
            print(f"获取屏幕录制时长失败: {str(e)}")
    
    # 创建缓存目录（如果不存在）
    CACHE_FOLDER = os.path.join(UPLOAD_FOLDER, 'cache')
    os.makedirs(CACHE_FOLDER, exist_ok=True)
    
    # 获取预生成静音音频缓存文件路径
    def get_silent_audio_cache(duration_ms):
        duration_rounded = round(duration_ms / 1000)  # 按秒取整
        cache_filename = f'silent_{duration_rounded}s.webm'
        return os.path.join(CACHE_FOLDER, cache_filename)
    
    # 获取预生成黑屏视频缓存文件路径
    def get_black_video_cache(duration_ms):
        duration_rounded = round(duration_ms / 1000)  # 按秒取整
        cache_filename = f'black_{duration_rounded}s.webm'
        return os.path.join(CACHE_FOLDER, cache_filename)
    
    # 处理音频状态变化记录
    audio_state_changes = []
    if 'audio_state_changes' in request.form:
        try:
            audio_state_changes = json.loads(request.form['audio_state_changes'])
            # 确保状态变化记录按时间顺序排列
            audio_state_changes.sort(key=lambda x: x['timestamp'])
        except json.JSONDecodeError:
            print("音频状态变化记录解析失败")
    
    # 处理摄像头状态变化记录
    camera_state_changes = []
    if 'camera_state_changes' in request.form:
        try:
            camera_state_changes = json.loads(request.form['camera_state_changes'])
            # 确保状态变化记录按时间顺序排列
            camera_state_changes.sort(key=lambda x: x['timestamp'])
        except json.JSONDecodeError:
            print("摄像头状态变化记录解析失败")
    
    # 处理音频文件
    audio_path = None
    if 'audio' in request.files:
        audio_file = request.files['audio']
        if audio_file.filename and audio_file.filename != '':
            # 保存上传的音频文件
            audio_filename = f'{hash_id}.webm'
            audio_path = os.path.join(UPLOAD_FOLDER, audio_filename)
            audio_file.save(audio_path)
            
            print(f"[DEBUG] 音频文件已保存: {audio_path}")
            print(f"[DEBUG] 音频文件大小: {os.path.getsize(audio_path)} bytes")
            
            try:
                # 检查是否有音频状态变化记录
                if audio_state_changes:
                    print(f"处理音频状态变化: {len(audio_state_changes)} 个变化点")
                    print(f"[DEBUG] 音频状态变化详情: {audio_state_changes}")
                    
                    # 预加载原始音频时长
                    try:
                        original_audio_duration = get_file_duration(audio_path)
                        print(f"[DEBUG] 原始音频时长: {original_audio_duration} ms")
                    except Exception as duration_err:
                        print(f"[DEBUG] 获取音频时长失败，使用total_duration: {duration_err}")
                        original_audio_duration = total_duration
                    
                    # 生成完整的状态变化序列（包括开始和结束）
                    audio_segments = []
                    if audio_state_changes:
                        # 设置初始状态（录制开始时的状态）
                        initial_state = audio_state_changes[0]['isEnabled']
                        initial_timestamp = audio_state_changes[0]['timestamp']
                        
                        # 如果初始状态不是从0开始，添加从0到初始状态的时间段
                        if initial_timestamp > 0:
                            audio_segments.append({
                                'isEnabled': initial_state,
                                'start': 0,
                                'end': initial_timestamp
                            })
                        
                        # 处理所有状态变化
                        for i, change in enumerate(audio_state_changes):
                            current_state = change['isEnabled']
                            start_time = change['timestamp']
                            end_time = audio_state_changes[i+1]['timestamp'] if i+1 < len(audio_state_changes) else total_duration
                            
                            audio_segments.append({
                                'isEnabled': current_state,
                                'start': start_time,
                                'end': end_time
                            })
                    else:
                        # 如果没有状态变化记录，默认使用关闭状态
                        audio_segments.append({
                            'isEnabled': False,
                            'start': 0,
                            'end': total_duration
                        })
                    
                    # 生成每个片段
                    temp_files = []
                    for i, segment in enumerate(audio_segments):
                        segment_duration = (segment['end'] - segment['start']) / 1000
                        
                        if segment_duration <= 0:
                            continue
                        
                        if segment['isEnabled'] and original_audio_duration > segment['start']:
                            # 需要从原始音频中截取片段
                            temp_file = os.path.join(UPLOAD_FOLDER, f'{hash_id}_audio_segment_{i}.webm')
                            
                            # 计算在原始音频中的开始和结束位置（秒）
                            original_start = max(0, segment['start']) / 1000
                            original_end = min(original_audio_duration, segment['end']) / 1000
                            
                            if original_end > original_start:
                                # 截取原始音频片段
                                cmd = [
                                    FFMPEG_PATH,
                                    '-i', audio_path,
                                    '-ss', str(original_start),
                                    '-to', str(original_end),
                                    '-c:a', 'copy',
                                    '-y', temp_file
                                ]
                                subprocess.run(cmd, check=True, capture_output=True)
                                
                                # 检查截取的音频是否达到了所需的时长
                                actual_duration = get_file_duration(temp_file)
                                if actual_duration < (segment['end'] - segment['start']):
                                    # 生成补充的静音片段
                                    supplement_duration = (segment['end'] - segment['start'] - actual_duration) / 1000
                                    supplement_file = get_silent_audio_cache(supplement_duration * 1000)
                                    if not os.path.exists(supplement_file):
                                        cmd = [
                                            FFMPEG_PATH, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                                            '-t', str(supplement_duration), '-c:a', 'libopus', '-b:a', '128k', '-y', supplement_file
                                        ]
                                        subprocess.run(cmd, check=True, capture_output=True)
                                    
                                    # 合并原始片段和补充片段
                                    merged_segment_file = os.path.join(UPLOAD_FOLDER, f'{hash_id}_audio_segment_{i}_merged.webm')
                                    merge_list = os.path.join(UPLOAD_FOLDER, f'{hash_id}_audio_segment_{i}_merge.txt')
                                    with open(merge_list, 'w') as f:
                                        f.write(f"file '{temp_file}'\n")
                                        f.write(f"file '{supplement_file}'\n")
                                    
                                    cmd = [
                                        FFMPEG_PATH,
                                        '-f', 'concat', '-safe', '0', '-i', merge_list,
                                        '-c:a', 'libopus', '-b:a', '128k', '-y', merged_segment_file
                                    ]
                                    subprocess.run(cmd, check=True, capture_output=True)
                                    
                                    # 清理临时文件
                                    os.unlink(merge_list)
                                    os.unlink(temp_file)
                                    
                                    # 使用合并后的片段
                                    temp_files.append(merged_segment_file)
                                else:
                                    temp_files.append(temp_file)
                            else:
                                # 生成静音片段
                                silent_file = get_silent_audio_cache(segment['end'] - segment['start'])
                                if not os.path.exists(silent_file):
                                    cmd = [
                                        FFMPEG_PATH, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                                        '-t', str(segment_duration), '-c:a', 'libopus', '-b:a', '128k', '-y', silent_file
                                    ]
                                    subprocess.run(cmd, check=True, capture_output=True)
                                temp_files.append(silent_file)
                        else:
                            # 生成静音片段
                            silent_file = get_silent_audio_cache(segment['end'] - segment['start'])
                            if not os.path.exists(silent_file):
                                cmd = [
                                    FFMPEG_PATH, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                                    '-t', str(segment_duration), '-c:a', 'libopus', '-b:a', '128k', '-y', silent_file
                                ]
                                subprocess.run(cmd, check=True, capture_output=True)
                            temp_files.append(silent_file)
                    
                    # 合并所有片段
                    if temp_files:
                        # 创建合并列表文件
                        merge_list = os.path.join(UPLOAD_FOLDER, f'{hash_id}_audio_merge.txt')
                        with open(merge_list, 'w') as f:
                            for file in temp_files:
                                f.write(f"file '{file}'\n")
                        
                        # 使用FFmpeg合并
                        merged_audio_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_merged.webm')
                        cmd = [
                            FFMPEG_PATH,
                            '-f', 'concat', '-safe', '0', '-i', merge_list,
                            '-c:a', 'libopus', '-b:a', '128k', '-y', merged_audio_path
                        ]
                        subprocess.run(cmd, check=True, capture_output=True)
                        
                        # 清理临时文件
                        os.unlink(merge_list)
                        for file in temp_files:
                            if os.path.exists(file) and file != audio_path:
                                os.unlink(file)
                        
                        # 更新音频文件路径
                        os.unlink(audio_path)
                        audio_path = merged_audio_path
                        print("音频状态变化处理完成")
                else:
                    # 没有状态变化记录，使用原有的时长检查逻辑
                    print("[DEBUG] 没有音频状态变化记录，检查音频时长")
                    try:
                        audio_duration = get_file_duration(audio_path)
                        print(f"[DEBUG] 音频文件时长: {audio_duration} ms")
                    except Exception as duration_err:
                        print(f"[DEBUG] 获取音频时长失败，跳过时长检查: {duration_err}")
                        audio_duration = total_duration  # 跳过时长检查
                    
                    if audio_duration < total_duration:
                        # 需要生成与总时长相同的音频
                        print(f"音频时长({audio_duration})小于总时长({total_duration})，需要合成")
                        
                        # 计算需要添加的静音时长
                        silent_duration = (total_duration - audio_duration) / 1000
                        if silent_duration > 0:
                            # 尝试使用缓存的静音音频
                            silent_audio_file = get_silent_audio_cache((total_duration - audio_duration))
                            
                            # 如果缓存不存在，生成并缓存
                            if not os.path.exists(silent_audio_file):
                                cmd = [
                                    FFMPEG_PATH, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                                    '-t', str(silent_duration), '-c:a', 'libopus', '-b:a', '128k', '-y', silent_audio_file
                                ]
                                subprocess.run(cmd, check=True, capture_output=True)
                                print(f"已生成并缓存静音音频: {silent_audio_file}")
                            
                            # 使用FFmpeg直接合并，无需临时文件列表
                            merged_audio_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_merged.webm')
                            cmd = [
                                FFMPEG_PATH,
                                '-i', audio_path,  # 原始音频
                                '-i', silent_audio_file,  # 静音音频
                                '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1',  # 仅合并音频
                                '-c:a', 'libopus', '-b:a', '128k', '-y', merged_audio_path
                            ]
                            subprocess.run(cmd, check=True, capture_output=True)
                            
                            # 删除原始文件
                            os.unlink(audio_path)
                            
                            # 更新音频文件路径
                            audio_path = merged_audio_path
            except Exception as e:
                print(f"处理音频文件失败: {str(e)}")
    else:
        # 没有上传音频文件，生成与总时长相同的静音音频
        audio_filename = f'{hash_id}.webm'
        audio_path = os.path.join(UPLOAD_FOLDER, audio_filename)
        
        # 尝试使用缓存的静音音频
        cache_silent_audio = get_silent_audio_cache(total_duration)
        if os.path.exists(cache_silent_audio):
            # 直接复制缓存文件
            import shutil
            shutil.copy2(cache_silent_audio, audio_path)
            print(f"使用缓存的静音音频: {cache_silent_audio}")
        else:
            # 生成新的静音音频
            cmd = [
                FFMPEG_PATH, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                '-t', str(total_duration / 1000), '-c:a', 'libopus', '-b:a', '128k', '-y', audio_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # 缓存生成的静音音频
            import shutil
            shutil.copy2(audio_path, cache_silent_audio)
            print(f"已生成并缓存静音音频: {cache_silent_audio}")

    # 处理摄像头录制文件
    webcam_recording_path = None
    if 'webcam_recording' in request.files:
        webcam_recording_file = request.files['webcam_recording']
        if webcam_recording_file.filename and webcam_recording_file.filename != '':
            # 保存上传的摄像头文件
            webcam_recording_filename = f'{hash_id}_webcam.webm'
            webcam_recording_path = os.path.join(UPLOAD_FOLDER, webcam_recording_filename)
            webcam_recording_file.save(webcam_recording_path)
            
            print(f"[DEBUG] 摄像头文件已保存: {webcam_recording_path}")
            print(f"[DEBUG] 摄像头文件大小: {os.path.getsize(webcam_recording_path)} bytes")
            
            try:
                # 检查是否有摄像头状态变化记录
                if camera_state_changes:
                    print(f"处理摄像头状态变化: {len(camera_state_changes)} 个变化点")
                    print(f"[DEBUG] 摄像头状态变化详情: {camera_state_changes}")
                    
                    # 预加载原始摄像头视频时长
                    try:
                        original_video_duration = get_file_duration(webcam_recording_path)
                        print(f"[DEBUG] 原始摄像头视频时长: {original_video_duration} ms")
                    except Exception as duration_err:
                        print(f"[DEBUG] 获取摄像头视频时长失败，使用total_duration: {duration_err}")
                        original_video_duration = total_duration
                    
                    # 生成完整的状态变化序列（包括开始和结束）
                    video_segments = []
                    if camera_state_changes:
                        # 设置初始状态（录制开始时的状态）
                        initial_state = camera_state_changes[0]['isEnabled']
                        initial_timestamp = camera_state_changes[0]['timestamp']
                        
                        # 如果初始状态不是从0开始，添加从0到初始状态的时间段
                        if initial_timestamp > 0:
                            video_segments.append({
                                'isEnabled': initial_state,
                                'start': 0,
                                'end': initial_timestamp
                            })
                        
                        # 处理所有状态变化
                        for i, change in enumerate(camera_state_changes):
                            current_state = change['isEnabled']
                            start_time = change['timestamp']
                            end_time = camera_state_changes[i+1]['timestamp'] if i+1 < len(camera_state_changes) else total_duration
                            
                            video_segments.append({
                                'isEnabled': current_state,
                                'start': start_time,
                                'end': end_time
                            })
                    else:
                        # 如果没有状态变化记录，默认使用关闭状态
                        video_segments.append({
                            'isEnabled': False,
                            'start': 0,
                            'end': total_duration
                        })
                    
                    # 生成每个片段
                    temp_files = []
                    for i, segment in enumerate(video_segments):
                        segment_duration = (segment['end'] - segment['start']) / 1000
                        
                        if segment_duration <= 0:
                            continue
                        
                        if segment['isEnabled'] and original_video_duration > segment['start']:
                            # 需要从原始视频中截取片段
                            temp_file = os.path.join(UPLOAD_FOLDER, f'{hash_id}_video_segment_{i}.webm')
                            
                            # 计算在原始视频中的开始和结束位置（秒）
                            original_start = max(0, segment['start']) / 1000
                            original_end = min(original_video_duration, segment['end']) / 1000
                            
                            if original_end > original_start:
                                # 截取原始视频片段
                                cmd = [
                                    FFMPEG_PATH,
                                    '-i', webcam_recording_path,
                                    '-ss', str(original_start),
                                    '-to', str(original_end),
                                    '-c:v', 'copy',
                                    '-y', temp_file
                                ]
                                subprocess.run(cmd, check=True, capture_output=True)
                                
                                # 检查截取的视频是否达到了所需的时长
                                actual_duration = get_file_duration(temp_file)
                                if actual_duration < (segment['end'] - segment['start']):
                                    # 生成补充的黑屏片段
                                    supplement_duration = (segment['end'] - segment['start'] - actual_duration) / 1000
                                    supplement_file = get_black_video_cache(supplement_duration * 1000)
                                    if not os.path.exists(supplement_file):
                                        cmd = [
                                            FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=c=black:s=640x480:r=30',
                                            '-t', str(supplement_duration), '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', supplement_file
                                        ]
                                        subprocess.run(cmd, check=True, capture_output=True)
                                    
                                    # 合并原始片段和补充片段
                                    merged_segment_file = os.path.join(UPLOAD_FOLDER, f'{hash_id}_video_segment_{i}_merged.webm')
                                    merge_list = os.path.join(UPLOAD_FOLDER, f'{hash_id}_video_segment_{i}_merge.txt')
                                    with open(merge_list, 'w') as f:
                                        f.write(f"file '{temp_file}'\n")
                                        f.write(f"file '{supplement_file}'\n")
                                    
                                    cmd = [
                                        FFMPEG_PATH,
                                        '-f', 'concat', '-safe', '0', '-i', merge_list,
                                        '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', merged_segment_file
                                    ]
                                    subprocess.run(cmd, check=True, capture_output=True)
                                    
                                    # 清理临时文件
                                    os.unlink(merge_list)
                                    os.unlink(temp_file)
                                    
                                    # 使用合并后的片段
                                    temp_files.append(merged_segment_file)
                                else:
                                    temp_files.append(temp_file)
                            else:
                                # 生成黑屏片段
                                black_file = get_black_video_cache(segment['end'] - segment['start'])
                                if not os.path.exists(black_file):
                                    cmd = [
                                        FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=c=black:s=640x480:r=30',
                                        '-t', str(segment_duration), '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', black_file
                                    ]
                                    subprocess.run(cmd, check=True, capture_output=True)
                                temp_files.append(black_file)
                        else:
                            # 生成黑屏片段
                            black_file = get_black_video_cache(segment['end'] - segment['start'])
                            if not os.path.exists(black_file):
                                cmd = [
                                    FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=c=black:s=640x480:r=30',
                                    '-t', str(segment_duration), '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', black_file
                                ]
                                subprocess.run(cmd, check=True, capture_output=True)
                            temp_files.append(black_file)
                    
                    # 合并所有片段
                    if temp_files:
                        # 创建合并列表文件
                        merge_list = os.path.join(UPLOAD_FOLDER, f'{hash_id}_video_merge.txt')
                        with open(merge_list, 'w') as f:
                            for file in temp_files:
                                f.write(f"file '{file}'\n")
                        
                        # 使用FFmpeg合并
                        merged_webcam_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_webcam_merged.webm')
                        cmd = [
                            FFMPEG_PATH,
                            '-f', 'concat', '-safe', '0', '-i', merge_list,
                            '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', merged_webcam_path
                        ]
                        subprocess.run(cmd, check=True, capture_output=True)
                        
                        # 清理临时文件
                        os.unlink(merge_list)
                        for file in temp_files:
                            if os.path.exists(file) and file != webcam_recording_path:
                                os.unlink(file)
                        
                        # 更新摄像头文件路径
                        os.unlink(webcam_recording_path)
                        webcam_recording_path = merged_webcam_path
                        print("摄像头状态变化处理完成")
                else:
                    # 没有状态变化记录，使用原有的时长检查逻辑
                    print("[DEBUG] 没有摄像头状态变化记录，检查摄像头视频时长")
                    try:
                        webcam_duration = get_file_duration(webcam_recording_path)
                        print(f"[DEBUG] 摄像头视频时长: {webcam_duration} ms")
                    except Exception as duration_err:
                        print(f"[DEBUG] 获取摄像头视频时长失败，跳过时长检查: {duration_err}")
                        webcam_duration = total_duration  # 跳过时长检查
                    
                    if webcam_duration < total_duration:
                        # 需要生成与总时长相同的摄像头视频
                        print(f"摄像头视频时长({webcam_duration})小于总时长({total_duration})，需要合成")
                        
                        # 计算需要添加的黑屏时长
                        black_duration = (total_duration - webcam_duration) / 1000
                        if black_duration > 0:
                            # 尝试使用缓存的黑屏视频
                            black_video_file = get_black_video_cache((total_duration - webcam_duration))
                            
                            # 如果缓存不存在，生成并缓存
                            if not os.path.exists(black_video_file):
                                cmd = [
                                    FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=c=black:s=640x480:r=30',
                                    '-t', str(black_duration), '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', black_video_file
                                ]
                                subprocess.run(cmd, check=True, capture_output=True)
                                print(f"已生成并缓存黑屏视频: {black_video_file}")
                            
                            # 使用FFmpeg直接合并，无需临时文件列表
                            merged_webcam_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_webcam_merged.webm')
                            cmd = [
                                FFMPEG_PATH,
                                '-i', webcam_recording_path,  # 原始摄像头视频
                                '-i', black_video_file,  # 黑屏视频
                                '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0',  # 仅合并视频
                                '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', merged_webcam_path
                            ]
                            subprocess.run(cmd, check=True, capture_output=True)
                            
                            # 删除原始文件
                            os.unlink(webcam_recording_path)
                            
                            # 更新摄像头文件路径
                            webcam_recording_path = merged_webcam_path
            except Exception as e:
                print(f"处理摄像头文件失败: {str(e)}")
    else:
        # 没有上传摄像头文件，生成与总时长相同的黑屏视频
        webcam_recording_filename = f'{hash_id}_webcam.webm'
        webcam_recording_path = os.path.join(UPLOAD_FOLDER, webcam_recording_filename)
        
        # 尝试使用缓存的黑屏视频
        cache_black_video = get_black_video_cache(total_duration)
        if os.path.exists(cache_black_video):
            # 直接复制缓存文件
            import shutil
            shutil.copy2(cache_black_video, webcam_recording_path)
            print(f"使用缓存的黑屏视频: {cache_black_video}")
        else:
            # 生成新的黑屏视频
            cmd = [
                FFMPEG_PATH, '-f', 'lavfi', '-i', 'color=c=black:s=640x480:r=30',
                '-t', str(total_duration / 1000), '-c:v', 'libvpx-vp9', '-b:v', '500k', '-y', webcam_recording_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # 缓存生成的黑屏视频
            import shutil
            shutil.copy2(webcam_recording_path, cache_black_video)
            print(f"已生成并缓存黑屏视频: {cache_black_video}")

    # 保存轨迹文件（现在仅包含状态变化信息）
    trajectory_filename = f'{hash_id}.json'
    trajectory_path = os.path.join(UPLOAD_FOLDER, trajectory_filename)
    
    # 创建轨迹数据对象
    trajectory_data = {
        'audioStateChanges': audio_state_changes,
        'cameraStateChanges': camera_state_changes
    }
    
    # 保存轨迹文件
    with open(trajectory_path, 'w', encoding='utf-8') as f:
        json.dump(trajectory_data, f, ensure_ascii=False, indent=2)

    # 生成 VTT 字幕文件
    subtitle_path = os.path.join(UPLOAD_FOLDER, f'{hash_id}_subtitle.vtt')
    generate_vtt(audio_path, subtitle_path)

    # 将信息保存到数据库
    # 首先检查是否有total_duration参数，如果有则创建或更新recording_sessions记录
    if total_duration > 0:
        # 生成一个session_id（使用相同的hash_id）
        session_id = hash_id
        
        # 检查recording_sessions表中是否已有该session_id
        existing_session = cursor.execute('SELECT * FROM recording_sessions WHERE session_id = ?', (session_id,)).fetchone()
        
        if existing_session:
            # 更新现有记录
            cursor.execute(
                'UPDATE recording_sessions SET total_duration = ?, status = ? WHERE session_id = ?',
                (total_duration, 'completed', session_id)
            )
        else:
            # 创建新记录
            cursor.execute(
                'INSERT INTO recording_sessions (session_id, created_at, status, total_duration, audio_state_changes, camera_state_changes) VALUES (?, ?, ?, ?, ?, ?)',
                (session_id, int(time.time() * 1000), 'completed', total_duration, json.dumps(audio_state_changes), json.dumps(camera_state_changes))
            )
    else:
        session_id = None
    
    # 插入recordings记录
    cursor.execute(
        'INSERT INTO recordings (id, session_id, trajectory_path, audio_path, screen_recording_path, webcam_recording_path, subtitle_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (hash_id, session_id, trajectory_path, audio_path, screen_recording_path, webcam_recording_path, subtitle_path, int(time.time() * 1000))
    )

    conn.commit()
    conn.close()

    return jsonify({'hashid': hash_id, 'message': '上传成功'})

@bp.route('/recordings/<hashid>', methods=['GET'])
def get_recording(hashid):
    """
    获取录音详情
    """
    conn = get_db_connection()
    # 关联查询获取录制详情和时长
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
        'createdAt': recording['created_at'],
        'duration': recording['total_duration'] / 1000 if recording['total_duration'] is not None and recording['total_duration'] > 0 else 0
    })

@bp.route('/recordings/<hashid>/audio', methods=['GET'])
def get_audio(hashid):
    """
    获取音频文件（支持流式传输）
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT * FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording:
        return jsonify({'error': '未找到录音'}), 404

    if not os.path.exists(recording['audio_path']):
        return jsonify({'error': '音频文件丢失'}), 404

    # 获取文件大小用于Content-Length头
    file_size = os.path.getsize(recording['audio_path'])
    mimetype = 'audio/webm'

    # 实现流式传输
    def generate():
        with open(recording['audio_path'], 'rb') as f:
            chunk = f.read(8192)  # 8KB chunks
            while chunk:
                yield chunk
                chunk = f.read(8192)

    # 设置响应头支持流式传输
    headers = {
        'Content-Length': str(file_size),
        'Content-Type': mimetype,
        'Accept-Ranges': 'bytes',
    }

    return current_app.response_class(generate(), mimetype=mimetype, headers=headers)

@bp.route('/recordings/<hashid>/screen', methods=['GET'])
def get_screen_recording(hashid):
    """
    获取录屏文件（支持流式传输）
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT screen_recording_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['screen_recording_path']:
        return jsonify({'error': '未找到录屏文件'}), 404

    if not os.path.exists(recording['screen_recording_path']):
        return jsonify({'error': '录屏文件丢失'}), 404

    # 获取文件大小用于Content-Length头
    file_size = os.path.getsize(recording['screen_recording_path'])
    mimetype = 'video/webm'

    # 实现流式传输
    def generate():
        with open(recording['screen_recording_path'], 'rb') as f:
            chunk = f.read(8192)  # 8KB chunks
            while chunk:
                yield chunk
                chunk = f.read(8192)

    # 设置响应头支持流式传输
    headers = {
        'Content-Length': str(file_size),
        'Content-Type': mimetype,
        'Accept-Ranges': 'bytes',
    }

    return current_app.response_class(generate(), mimetype=mimetype, headers=headers)

@bp.route('/recordings/<hashid>/webcam', methods=['GET'])
def get_webcam_recording(hashid):
    """
    获取摄像头录制文件（支持流式传输）
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT webcam_recording_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['webcam_recording_path']:
        return jsonify({'error': '未找到摄像头录制文件'}), 404

    if not os.path.exists(recording['webcam_recording_path']):
        return jsonify({'error': '摄像头录制文件丢失'}), 404

    # 获取文件大小用于Content-Length头
    file_size = os.path.getsize(recording['webcam_recording_path'])
    mimetype = 'video/webm'

    # 实现流式传输
    def generate():
        with open(recording['webcam_recording_path'], 'rb') as f:
            chunk = f.read(8192)  # 8KB chunks
            while chunk:
                yield chunk
                chunk = f.read(8192)

    # 设置响应头支持流式传输
    headers = {
        'Content-Length': str(file_size),
        'Content-Type': mimetype,
        'Accept-Ranges': 'bytes',
    }

    return current_app.response_class(generate(), mimetype=mimetype, headers=headers)

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

@bp.route('/recordings/<hashid>/trajectory', methods=['GET'])
def get_trajectory(hashid):
    """
    获取轨迹文件
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT trajectory_path FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()

    if not recording or not recording['trajectory_path']:
        return jsonify({'error': '未找到轨迹文件'}), 404

    if not os.path.exists(recording['trajectory_path']):
        return jsonify({'error': '轨迹文件丢失'}), 404

    return send_file(recording['trajectory_path'], mimetype='application/json')

@bp.route('/recordings', methods=['GET'])
def get_recordings():
    """
    获取所有录制列表
    """
    conn = get_db_connection()
    # 关联查询recordings和recording_sessions表，获取录制时长
    recordings = conn.execute('''
        SELECT r.id, r.created_at, r.screen_recording_path, r.webcam_recording_path, r.subtitle_path, r.session_id,
               rs.total_duration
        FROM recordings r
        LEFT JOIN recording_sessions rs ON r.session_id = rs.session_id
        ORDER BY r.created_at DESC
    ''').fetchall()
    conn.close()

    return jsonify([{
        'hashid': recording['id'],
        'created_at': recording['created_at'],
        # 将毫秒转换为秒，并确保返回有效值
        'duration': recording['total_duration'] / 1000 if recording['total_duration'] is not None and recording['total_duration'] > 0 else 0,
        'hasScreenRecording': recording['screen_recording_path'] is not None,
        'hasWebcamRecording': recording['webcam_recording_path'] is not None,
        'hasSubtitle': recording['subtitle_path'] is not None
    } for recording in recordings])

@bp.route('/recordings', methods=['DELETE'])
def delete_all_recordings():
    """
    清空所有录制数据
    """
    conn = get_db_connection()
    recordings = conn.execute('SELECT * FROM recordings').fetchall()
    
    # 删除所有关联文件
    for recording in recordings:
        file_paths = [
            recording['audio_path'],
            recording['trajectory_path'],
            recording['screen_recording_path'],
            recording['webcam_recording_path'],
            recording['subtitle_path'],
            recording['subtitled_video_path']
        ]
        
        for file_path in file_paths:
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"删除文件失败: {file_path}, 错误: {e}")
    
    # 清空数据库表
    conn.execute('DELETE FROM recordings')
    conn.commit()
    conn.close()
    
    return jsonify({'message': '所有录制数据已清空'})

@bp.route('/recordings/<hashid>', methods=['DELETE'])
def delete_recording(hashid):
    """
    删除单个录制数据
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT * FROM recordings WHERE id = ?', (hashid,)).fetchone()
    
    if not recording:
        conn.close()
        return jsonify({'error': '未找到录制数据'}), 404
    
    # 删除所有关联文件
    file_paths = [
        recording['audio_path'],
        recording['trajectory_path'],
        recording['screen_recording_path'],
        recording['webcam_recording_path'],
        recording['subtitle_path'],
        recording['subtitled_video_path']
    ]
    
    for file_path in file_paths:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"删除文件失败: {file_path}, 错误: {e}")
    
    # 从数据库中删除记录
    conn.execute('DELETE FROM recordings WHERE id = ?', (hashid,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': '录制数据已删除'})

@bp.route('/recordings/<hashid>/all-files', methods=['GET'])
def get_all_files(hashid):
    """
    获取所有录制相关文件的压缩包
    """
    conn = get_db_connection()
    recording = conn.execute('SELECT * FROM recordings WHERE id = ?', (hashid,)).fetchone()
    conn.close()
    
    if not recording:
        return jsonify({'error': '未找到录制数据'}), 404
    
    # 收集所有文件路径
    file_paths = [
        ('audio', recording['audio_path']),
        ('trajectory', recording['trajectory_path']),
        ('screen_recording', recording['screen_recording_path']),
        ('webcam_recording', recording['webcam_recording_path']),
        ('subtitle', recording['subtitle_path']),
        ('subtitled_video', recording['subtitled_video_path'])
    ]
    
    # 创建临时目录和zip文件
    with tempfile.TemporaryDirectory() as temp_dir:
        zip_filename = f'recording_{hashid}.zip'
        zip_path = os.path.join(temp_dir, zip_filename)
        
        # 创建zip文件并添加所有存在的文件
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for file_type, file_path in file_paths:
                if file_path and os.path.exists(file_path):
                    # 获取原始文件名
                    original_filename = os.path.basename(file_path)
                    # 重命名文件，添加hashid前缀以便区分
                    new_filename = f"{hashid}_{file_type}{os.path.splitext(original_filename)[1]}"
                    # 添加文件到zip
                    zipf.write(file_path, new_filename)
        
        # 发送zip文件给客户端
        return send_file(zip_path, as_attachment=True, download_name=zip_filename)

@bp.route('/recordings/sessions/<session_id>/playback', methods=['GET'])
def get_session_playback_data(session_id):
    """
    获取会话的回放数据
    返回三个媒体流的URL、音频和摄像头的状态变化记录，以及总时长
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取会话信息
    session = cursor.execute(
        'SELECT * FROM recording_sessions WHERE session_id = ?',
        (session_id,)
    ).fetchone()
    
    if not session:
        conn.close()
        return jsonify({'error': '录制会话不存在'}), 404
    
    # 获取合成后的媒体文件路径
    final_screen_path = session['final_screen_path']
    final_camera_path = session['final_camera_path']
    final_audio_path = session['final_audio_path']
    total_duration = session['total_duration']
    
    # 获取音频和摄像头状态变化记录
    audio_state_changes = []
    camera_state_changes = []
    
    if session['audio_state_changes']:
        try:
            audio_state_changes = json.loads(session['audio_state_changes'])
        except json.JSONDecodeError:
            print("解析音频状态变化记录失败")
    
    if session['camera_state_changes']:
        try:
            camera_state_changes = json.loads(session['camera_state_changes'])
        except json.JSONDecodeError:
            print("解析摄像头状态变化记录失败")
    
    conn.close()
    
    # 构建响应
    response = {
        'session_id': session_id,
        'total_duration': total_duration,
        'audio_state_changes': audio_state_changes,
        'camera_state_changes': camera_state_changes,
        'media_urls': {
            'screen': f'/api/recordings/sessions/{session_id}/media/screen' if final_screen_path else None,
            'camera': f'/api/recordings/sessions/{session_id}/media/camera' if final_camera_path else None,
            'audio': f'/api/recordings/sessions/{session_id}/media/audio' if final_audio_path else None
        }
    }
    
    return jsonify(response)

@bp.route('/recordings/sessions/<session_id>/media/<media_type>', methods=['GET'])
def get_session_media(session_id, media_type):
    """
    获取会话的媒体文件（支持流式传输）
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取会话信息
    session = cursor.execute(
        'SELECT * FROM recording_sessions WHERE session_id = ?',
        (session_id,)
    ).fetchone()
    
    if not session:
        conn.close()
        return jsonify({'error': '录制会话不存在'}), 404
    
    # 确定媒体文件路径
    media_path = None
    if media_type == 'screen':
        media_path = session['final_screen_path']
    elif media_type == 'camera':
        media_path = session['final_camera_path']
    elif media_type == 'audio':
        media_path = session['final_audio_path']
    else:
        conn.close()
        return jsonify({'error': '不支持的媒体类型'}), 400
    
    conn.close()
    
    if not media_path or not os.path.exists(media_path):
        return jsonify({'error': '媒体文件不存在'}), 404
    
    # 根据媒体类型设置合适的MIME类型
    mime_type = 'video/webm'
    if media_type == 'audio':
        mime_type = 'audio/webm'
    
    return send_file(media_path, mimetype=mime_type)
