from flask import jsonify

class ApiError(Exception):
    def __init__(self, message, status_code=400, payload=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload or {}

def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(error):
        response = jsonify({"error": error.message, **error.payload})
        response.status_code = error.status_code
        return response

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500
