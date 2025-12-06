from flask import Flask
from flask_cors import CORS
from backend.dao.database import init_db
from backend.routes import api

def create_app():
    app = Flask(__name__)
    
    # 启用 CORS
    CORS(app)
    
    # 注册蓝图，设置前缀为 /api
    app.register_blueprint(api, url_prefix='/api')
    
    # 初始化数据库
    init_db()
    
    return app

if __name__ == '__main__':
    app = create_app()
    print("服务器运行在 http://localhost:3001")
    app.run(port=3001, debug=True)
