from flask import Blueprint
from .recordings import bp as recordings_bp

api = Blueprint('api', __name__)
api.register_blueprint(recordings_bp)
