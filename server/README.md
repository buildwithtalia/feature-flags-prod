Feature Flags API - Flask Server Stub

This folder contains a generated Flask server stub based on the Postman collection "Feature Flags API".

How to run:
1. python3 -m venv .venv && source .venv/bin/activate
2. pip install -r requirements.txt
3. export FLASK_APP=app:create_app
4. flask run --port 5000

Run tests:
- pytest -q

Project structure:
- app/__init__.py            -> app factory, error handlers, auth scaffold
- app/routes/feature_flags.py -> route registrations
- app/controllers/feature_flags_controller.py -> endpoint logic stubs
- app/models/feature_flag.py  -> simple data model + validation
- app/common/errors.py        -> error types and handlers
- tests/test_feature_flags.py -> pytest tests per endpoint
- requirements.txt
