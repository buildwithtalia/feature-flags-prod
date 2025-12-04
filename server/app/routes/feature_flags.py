from flask import Blueprint
from ..common.auth import require_auth
from ..controllers.feature_flags_controller import (
    list_flags,
    create_flag,
    get_flag,
    delete_flag,
    enable_flag,
    disable_flag,
    enable_flag_for_segment,
)

bp = Blueprint('feature_flags', __name__)

# Derived from Postman collection
# GET {{baseURL}}/featureflags
bp.add_url_rule('/featureflags', view_func=require_auth()(list_flags), methods=['GET'])

# POST {{baseURL}}/featureflags
bp.add_url_rule('/featureflags', view_func=require_auth()(create_flag), methods=['POST'])

# GET {{baseURL}}/featureflags/{{flag_id}}
bp.add_url_rule('/featureflags/<string:flag_id>', view_func=require_auth()(get_flag), methods=['GET'])

# DELETE {{baseURL}}/featureflags/{{flag_id}}
bp.add_url_rule('/featureflags/<string:flag_id>', view_func=require_auth()(delete_flag), methods=['DELETE'])

# POST {{baseURL}}/featureflags/{{flag_id}}/enable
bp.add_url_rule('/featureflags/<string:flag_id>/enable', view_func=require_auth()(enable_flag), methods=['POST'])

# POST {{baseURL}}/featureflags/{{flag_id}}/enable_for_segment
bp.add_url_rule('/featureflags/<string:flag_id>/enable_for_segment', view_func=require_auth()(enable_flag_for_segment), methods=['POST'])

# POST {{baseURL}}/featureflags/{{flag_id}}/disable
bp.add_url_rule('/featureflags/<string:flag_id>/disable', view_func=require_auth()(disable_flag), methods=['POST'])
