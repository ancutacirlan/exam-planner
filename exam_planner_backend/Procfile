web: flask db upgrade && gunicorn main:app --timeout 120
release: python init_admin.py
web: gunicorn main:app --timeout 120
