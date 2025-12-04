from flask import Flask, jsonify, request
from .common.errors import register_error_handlers, ApiError
from .common.auth import auth_init, require_auth

def create_app():
    app = Flask(__name__)

    # Config defaults
    app.config.setdefault('JSON_SORT_KEYS', False)

    # Auth (collection-level scaffold; no concrete scheme found in collection)
    auth_init(app)

    # Error handlers
    register_error_handlers(app)

    # Blueprints / routes
    from .routes.feature_flags import bp as feature_flags_bp
    app.register_blueprint(feature_flags_bp, url_prefix='')

    @app.get('/')
    def health():
        return jsonify({"status": "ok"})

    return app
