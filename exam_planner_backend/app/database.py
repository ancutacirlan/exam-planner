from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Inițializăm baza de date și Flask-Migrate
db = SQLAlchemy()
migrate = Migrate()
