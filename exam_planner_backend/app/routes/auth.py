import os
import secrets
from flask import Blueprint, request, jsonify, session, redirect, current_app
from flasgger import swag_from
from flask_jwt_extended import create_access_token
from authlib.integrations.flask_client import OAuth

from app.models import User

auth_bp = Blueprint("auth", __name__)
oauth = OAuth()


def init_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name="google",
        client_id=app.config["GOOGLE_CLIENT_ID"],
        client_secret=app.config["GOOGLE_CLIENT_SECRET"],
        access_token_url="https://oauth2.googleapis.com/token",
        authorize_url="https://accounts.google.com/o/oauth2/auth",
        authorize_params={"scope": "openid email profile"},
        jwks_uri="https://www.googleapis.com/oauth2/v3/certs",
        client_kwargs={"scope": "openid email profile"},
    )


@auth_bp.route("/login", methods=["GET"])
@swag_from({
    'tags': ['Autentificare'],
    'summary': 'Login Google',
    'description': 'Redirecționează utilizatorul către autentificarea Google.',
    'responses': {
        302: {
            'description': 'Redirecționare către Google pentru autentificare.'
        }
    }
})
def login():
    state = secrets.token_urlsafe(16)
    session["oauth_state"] = state  # Salvăm manual în sesiune
    return oauth.google.authorize_redirect(
        redirect_uri=current_app.config["GOOGLE_REDIRECT_URI"],
        state=state
    )


@auth_bp.route("/auth/callback", methods=["GET"])
@swag_from({
    'tags': ['Autentificare'],
    'summary': 'Callback după login',
    'description': 'Primește tokenul de la Google, verifică emailul și loghează utilizatorul dacă există în baza de date.',
    'responses': {
        200: {'description': 'Token de acces JWT trimis utilizatorului.'},
        403: {'description': 'Acces refuzat. Utilizatorul nu are permisiune.'}
    }
})
def callback():
    # Verificare CSRF state
    state_sent = request.args.get("state")
    state_saved = session.get("oauth_state")
    if state_sent != state_saved:
        return "⚠️ CSRF Warning! State not equal in request and response.", 400

    # Obține tokenul și user info
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.get("https://www.googleapis.com/oauth2/v3/userinfo").json()

    if not user_info:
        return jsonify({"error": "Nu s-au putut obține informațiile utilizatorului."}), 400

    email = user_info.get("email")
    user = User.query.filter_by(email=email).first()

    if user:
        access_token = create_access_token(
            identity=str(user.user_id),
            additional_claims={"role": user.role.value}
        )

        # Redirecționează spre frontend și trimite tokenul în URL (sau altă metodă)
        frontend_url = current_app.config["FRONTEND_URL"]
        return redirect(f"{frontend_url}/auth/callback?token={access_token}")
    return jsonify({"error": "Nu ai acces. Contactează administratorul."}), 403


@auth_bp.route("/logout")
@swag_from({
    'tags': ['Autentificare'],
    'summary': 'Logout',
    'description': 'Deconectează utilizatorul curent și șterge sesiunea.',
    'responses': {
        302: {
            'description': 'Redirecționare după logout.'
        }
    }
})
def logout():
    session.clear()
    response = jsonify({"message": "Logged out"})
    response.set_cookie("access_token", "", expires=0)
    return response
