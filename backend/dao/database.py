import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.sqlite')

def get_db_connection():
    """
    获取数据库连接
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    初始化数据库
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 创建 recordings 表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recordings (
            id TEXT PRIMARY KEY,
            trajectory_path TEXT,
            audio_path TEXT,
            screen_recording_path TEXT,
            webcam_recording_path TEXT,
            subtitle_path TEXT,
            subtitled_video_path TEXT,
            created_at INTEGER
        )
    ''')
    
    conn.commit()
    conn.close()
    print('数据库已初始化')
