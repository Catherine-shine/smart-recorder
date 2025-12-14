import sqlite3
import os

# 数据库路径
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data.db')

def get_db_connection():
    """
    获取数据库连接
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # 使查询结果可以通过列名访问
    return conn

def init_db():
    """
    初始化数据库
    """
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # 创建 recordings 表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        trajectory_path TEXT,
        audio_path TEXT,
        screen_recording_path TEXT,
        webcam_recording_path TEXT,
        subtitle_path TEXT,
        subtitled_video_path TEXT,
        created_at INTEGER
    )
    ''')
    
    # 创建 recording_sessions 表（用于存储录制会话信息）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS recording_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        created_at INTEGER,
        status TEXT,  -- active, completed, failed
        total_duration REAL,
        final_screen_path TEXT,
        final_camera_path TEXT,
        final_audio_path TEXT,
        audio_state_changes TEXT,  -- JSON字符串，存储音频状态变化
        camera_state_changes TEXT   -- JSON字符串，存储摄像头状态变化
    )
    ''')
    
    # 创建 recording_segments 表（用于存储分段媒体数据信息）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS recording_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        segment_type TEXT,  -- screen, camera, audio
        start_time REAL,  -- 相对于录屏开始时间的开始时间（毫秒）
        end_time REAL,  -- 相对于录屏开始时间的结束时间（毫秒）
        file_path TEXT,
        FOREIGN KEY (session_id) REFERENCES recording_sessions(session_id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print('数据库已初始化')
