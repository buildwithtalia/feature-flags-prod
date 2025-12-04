from flask import jsonify, request
from ..models.feature_flag import FeatureFlag, SegmentRequest
from ..common.errors import ApiError
from datetime import datetime

# In-memory store for stub
FLAGS = {}

def list_flags():
    enabled_param = request.args.get('enabled')
    if enabled_param is None:
        flags = list(FLAGS.values())
    else:
        want = enabled_param.lower() == 'true'
        flags = [f for f in FLAGS.values() if f.get('enabled') == want]
    return jsonify(flags), 200


def create_flag():
    if not request.is_json:
        raise ApiError("Content-Type must be application/json", 415)
    data = request.get_json(silent=True) or {}
    try:
        # name is optional per tests; id, enabled required from example
        ff = FeatureFlag(**data)
    except Exception as e:
        raise ApiError(f"Invalid request body: {e}", 400)

    now = datetime.utcnow().isoformat() + 'Z'
    stored = ff.model_dump()
    stored.setdefault('name', ff.id)
    stored['createdAt'] = stored.get('createdAt') or now
    stored['updatedAt'] = stored.get('updatedAt') or now
    FLAGS[ff.id] = stored
    return jsonify(stored), 201


def get_flag(flag_id: str):
    flag = FLAGS.get(flag_id)
    if not flag:
        raise ApiError("Flag not found", 404)
    return jsonify(flag), 200


def delete_flag(flag_id: str):
    # Soft delete: keep but set enabled False
    flag = FLAGS.get(flag_id)
    if not flag:
        return '', 404
    flag['enabled'] = False
    flag['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
    return '', 204


def enable_flag(flag_id: str):
    flag = FLAGS.get(flag_id)
    if not flag:
        raise ApiError("Flag not found", 404)
    flag['enabled'] = True
    flag['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
    return jsonify(flag), 200


def disable_flag(flag_id: str):
    flag = FLAGS.get(flag_id)
    if not flag:
        raise ApiError("Flag not found", 404)
    flag['enabled'] = False
    flag['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
    return jsonify(flag), 200


def enable_flag_for_segment(flag_id: str):
    flag = FLAGS.get(flag_id)
    if not flag:
        raise ApiError("Flag not found", 404)
    if not request.is_json:
        raise ApiError("Content-Type must be application/json", 415)
    data = request.get_json(silent=True) or {}
    try:
        SegmentRequest(**data)
    except Exception as e:
        raise ApiError(f"Invalid request body: {e}", 400)
    # No real segment logic in stub
    return jsonify(flag), 200
