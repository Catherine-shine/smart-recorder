# backend/start.py
import subprocess
import sys
import time


def check_dependencies():
    """检查依赖是否安装"""
    required = ['flask', 'whisper', 'moviepy', 'webvtt-py']
    print("检查依赖包...")

    for package in required:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package}")
        except ImportError:
            print(f"✗ {package} 未安装")
            return False
    return True


if __name__ == '__main__':
    if not check_dependencies():
        print("\n请安装缺失的依赖包：")
        print("pip install -r requirements.txt")
        sys.exit(1)

    print("\n启动后端服务器...")
    subprocess.run([sys.executable, "app.py"])