from flasgger import Swagger
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

import app
from app.config import Config
from app.database import db, migrate
from app.import_data import add_admin
from app.models import User
from app.routes.auth import init_oauth, auth_bp
from app.routes.courses import courses_bp
from app.routes.download import download_bp
from app.routes.exams import exams_bp
from app.routes.import_from_excel import upload_bp
from app.routes.rooms import rooms_bp
from app.routes.settings import settings_bp
from app.routes.users import users_bp

jwt = JWTManager()


def create_app():
    """Funcție de creare a aplicației Flask"""
    app = Flask(__name__)


    app.config.from_object(Config)
    CORS(app, supports_credentials=True, origins=[app.config["FRONTEND_URL"]])


    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "My API",
            "description": "Documentație pentru API-ul aplicației",
            "version": "1.0"
        },
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "Introdu Bearer <token> pentru autentificare"
            }
        },
        "security": [{"Bearer": []}]

    }
    Swagger(app, template=swagger_template)

    # Inițializăm baza de date și Flask-Migrate
    db.init_app(app)
    migrate.init_app(app, db)

    jwt.init_app(app)
    init_oauth(app)

    # Importă modelele pentru a fi vizibile în migrații

    # # Aplicația va folosi un alt mecanism de autentificare pentru utilizatorii logați cu JWT
    # @jwt.user_loader_callback
    # def load_user_from_jwt(identity):
    #     # identity va fi de obicei ID-ul utilizatorului din token
    #     return User.query.get(identity)

    app.register_blueprint(auth_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(exams_bp)
    app.register_blueprint(download_bp)
    app.register_blueprint(rooms_bp)

    return app


# Creăm aplicația și legăm migrarea
app = create_app()
