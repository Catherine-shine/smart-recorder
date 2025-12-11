# C:\Users\LENOVO\smart-recorder\backend\start.py
from app import create_app 

# 创建Flask app实例
app = create_app()

if __name__ == '__main__':
    # 启动服务：端口改为8080（对齐前端配置），允许外部访问
    host = '0.0.0.0'
    port = 8080
    print(f"服务器运行在 http://{host}:{port}")
    app.run(host=host, port=port, debug=True)
