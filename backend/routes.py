from flask import Blueprint, request, jsonify, send_file, current_app
from database import get_db_connection
import os
import hashlib
import time
import json

# 创建蓝图
api = Blueprint('api', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')

@api.route('/recordings', methods=['POST'])
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

    # 插入数据库
    cursor.execute(
        'INSERT INTO recordings (id, trajectory_path, audio_path, created_at) VALUES (?, ?, ?, ?)',
        (hash_id, saved_trajectory_path, saved_audio_path, int(time.time() * 1000))
    )
    conn.commit()
    conn.close()

    return jsonify({'hashid': hash_id})

@api.route('/recordings/<hashid>', methods=['GET'])
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
        'createdAt': recording['created_at']
    })

@api.route('/recordings/<hashid>/audio', methods=['GET'])
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
