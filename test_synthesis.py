import requests
import json
import time
import os

# 测试配置
BACKEND_URL = 'http://localhost:3001/api'
TEST_FILES_DIR = 'test_files'

# 确保测试目录存在
os.makedirs(TEST_FILES_DIR, exist_ok=True)

def test_recording_synthesis():
    """测试录制合成功能"""
    try:
        # 1. 初始化录制会话
        print("1. 初始化录制会话...")
        session_response = requests.post(f'{BACKEND_URL}/recordings/sessions')
        session_response.raise_for_status()
        session_id = session_response.json()['session_id']
        print(f"   会话ID: {session_id}")
        
        # 2. 模拟分段上传（这里我们只上传一次完整数据）
        print("\n2. 模拟上传分段数据...")
        
        # 创建测试的空白媒体文件（使用ffmpeg生成）
        create_test_media_files()
        
        # 分别上传不同类型的分段数据
        segment_files = [
            {'type': 'screen', 'file_path': f'{TEST_FILES_DIR}/screen_test.webm'},
            {'type': 'camera', 'file_path': f'{TEST_FILES_DIR}/webcam_test.webm'},
            {'type': 'audio', 'file_path': f'{TEST_FILES_DIR}/audio_test.webm'}
        ]
        
        for segment in segment_files:
            files = {
                segment['type']: open(segment['file_path'], 'rb')
            }
            
            data = {
                'segment_type': segment['type'],
                'start_time': '0',
                'end_time': '5000'
            }
            
            segment_response = requests.post(
                f'{BACKEND_URL}/recordings/sessions/{session_id}/segments',
                files=files,
                data=data
            )
            segment_response.raise_for_status()
            print(f"   {segment['type']} 分段上传成功: {segment_response.json()}")
            
            # 关闭文件
            files[segment['type']].close()
        
        print("   所有分段数据上传完成")
        
        # 3. 完成录制会话
        print("\n3. 完成录制会话...")
        complete_data = {
            'total_duration': 5000,
            'device_states': {
                'audio': [{'timestamp': 0, 'isEnabled': True}],
                'camera': [{'timestamp': 0, 'isEnabled': True}]
            }
        }
        
        complete_response = requests.post(
            f'{BACKEND_URL}/recordings/sessions/{session_id}/complete',
            json=complete_data
        )
        complete_response.raise_for_status()
        result = complete_response.json()
        print(f"   会话完成成功: {result}")
        
        # 4. 验证合成结果
        print("\n4. 验证合成结果...")
        session_id = result.get('result', {}).get('session_id')
        if session_id:
            # 检查合成后的文件是否存在
            synthesis_result = result.get('result', {})
            final_screen_path = synthesis_result.get('final_screen_path')
            final_camera_path = synthesis_result.get('final_camera_path')
            final_audio_path = synthesis_result.get('final_audio_path')
            
            print(f"   合成结果详情: {synthesis_result}")
            
            # 检查文件是否存在
            files_exist = all(os.path.exists(path) for path in [final_screen_path, final_camera_path, final_audio_path])
            
            if files_exist:
                print(f"   ✅ 所有合成文件已成功创建")
                print(f"   屏幕视频: {final_screen_path}")
                print(f"   摄像头视频: {final_camera_path}")
                print(f"   音频文件: {final_audio_path}")
                print(f"   总时长: {synthesis_result.get('total_duration')} 毫秒")
                
                return True
            else:
                print(f"   ❌ 合成文件创建失败")
                return False
        
        return False
        
    except requests.RequestException as e:
        print(f"测试失败: {e}")
        return False

def create_test_media_files():
    """创建测试用的媒体文件"""
    # 检查是否已经有测试文件
    if all(os.path.exists(f'{TEST_FILES_DIR}/{name}') for name in [
        'screen_test.webm', 'webcam_test.webm', 'audio_test.webm', 'trajectory.json'
    ]):
        print("   测试文件已存在，跳过创建")
        return
    
    print("   创建测试媒体文件...")
    
    # 使用ffmpeg生成测试文件
    import subprocess
    import sys
    
    # 检查ffmpeg是否可用
    try:
        subprocess.run(['ffmpeg', '-version'], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("   警告: ffmpeg未安装，无法生成测试文件")
        print("   请手动创建或安装ffmpeg")
        sys.exit(1)
    
    # 生成测试屏幕视频（5秒，1280x720）
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=1280x720:r=30',
        '-t', '5', '-c:v', 'libvpx', '-b:v', '1M', f'{TEST_FILES_DIR}/screen_test.webm'
    ], check=True)
    
    # 生成测试摄像头视频（5秒，320x240）
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i', 'color=c=green:s=320x240:r=30',
        '-t', '5', '-c:v', 'libvpx', '-b:v', '500k', f'{TEST_FILES_DIR}/webcam_test.webm'
    ], check=True)
    
    # 生成测试音频（5秒，44.1kHz，单声道）
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=5',
        '-c:a', 'libvorbis', '-b:a', '64k', f'{TEST_FILES_DIR}/audio_test.webm'
    ], check=True)
    
    # 生成测试轨迹数据
    trajectory_data = {
        'mouse': [
            {'x': 100, 'y': 100, 'timestamp': 0},
            {'x': 200, 'y': 200, 'timestamp': 1000},
            {'x': 300, 'y': 300, 'timestamp': 2000}
        ],
        'whiteboard': []
    }
    
    with open(f'{TEST_FILES_DIR}/trajectory.json', 'w') as f:
        json.dump(trajectory_data, f)
    
    print("   测试文件创建完成")

if __name__ == '__main__':
    print("开始测试录制合成功能...")
    print("=" * 50)
    
    success = test_recording_synthesis()
    
    print("=" * 50)
    if success:
        print("测试成功！")
    else:
        print("测试失败！")
        exit(1)
