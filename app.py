from flask import Flask, request, jsonify, abort

app = Flask(__name__)

# Helper function to get feature flag by ID (handles both string and int IDs)
def get_flag(flag_id):
    # Try as-is (string from URL)
    flag = feature_flags.get(flag_id)
    if flag:
        return flag
    # Try converting to int if it's a numeric string
    try:
        int_id = int(flag_id)
        return feature_flags.get(int_id)
    except (ValueError, TypeError):
        return None

# In-memory storage for feature flags
feature_flags = {
    "beta_dashboard": {
        "id": "beta_dashboard",
        "enabled": True,
        "description": "Enable access to the new dashboard"
    },
    "live_chat": {
        "id": "live_chat",
        "enabled": False,
        "description": "Enable live chat support for users"
    }
}

@app.route('/featureflags', methods=['GET'])
def list_feature_flags():
    return jsonify(list(feature_flags.values())), 200

@app.route('/featureflags', methods=['POST'])
def create_feature_flag():
    data = request.get_json()
    if not data or 'id' not in data or 'enabled' not in data or 'description' not in data:
        return jsonify({"error": "Missing required fields: id, enabled, description"}), 400
    flag_id = data['id']
    if flag_id in feature_flags:
        return jsonify({"error": "Feature flag already exists"}), 409
    feature_flags[flag_id] = {
        "id": flag_id,
        "enabled": data['enabled'],
        "description": data['description']
    }
    return jsonify(feature_flags[flag_id]), 201

@app.route('/featureflags/<flag_id>', methods=['DELETE'])
def delete_feature_flag(flag_id):
    flag = get_flag(flag_id)
    if not flag:
        abort(404)
    # Delete using the correct key type
    try:
        int_id = int(flag_id)
        if int_id in feature_flags:
            del feature_flags[int_id]
        else:
            del feature_flags[flag_id]
    except (ValueError, TypeError):
        del feature_flags[flag_id]
    return '', 204

@app.route('/featureflags/<flag_id>/enable', methods=['POST'])
def enable_feature_flag(flag_id):
    flag = get_flag(flag_id)
    if not flag:
        abort(404, description="Feature flag not found")
    flag['enabled'] = True
    return jsonify(flag), 200

@app.route('/featureflags/<flag_id>/disable', methods=['POST'])
def disable_feature_flag(flag_id):
    flag = get_flag(flag_id)
    if not flag:
        abort(404, description="Feature flag not found")
    flag['enabled'] = False
    return jsonify(flag), 200

@app.route('/featureflags/<flag_id>', methods=['GET'])
def get_feature_flag_by_id(flag_id):
    flag = get_flag(flag_id)
    if not flag:
        abort(404)
    return jsonify(flag), 200

if __name__ == '__main__':
    app.run(debug=True)