import os
import threading

import pandas as pd
from flasgger import swag_from
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from app.decorators import roles_required
from app.email import send_email_notification
from app.import_data import fetch_and_store_data
from app.models import db, User, UserRole, Group

upload_bp = Blueprint("upload", __name__)

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"xlsx"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route("/upload-users", methods=["POST"])
@roles_required("ADM", "SEC")
@swag_from({
    'tags': ['Upload'],
    "summary": "Încarcă un fișier Excel cu utilizatori.",
    "description": "    Încarcă un fișier Excel cu utilizatori.",
    'consumes': ['multipart/form-data'],
    'parameters': [
        {
            'name': 'file',
            'in': 'formData',
            'type': 'file',
            'required': True,
            'description': 'Fișier Excel .xlsx'
        }
    ],
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Fișier procesat cu succes.'
        },
        401: {
            'description': 'Autentificare necesară.'
        },
        403: {
            'description': 'Acces interzis. Rol insuficient.'
        }
    }
})
def upload_users():
    if "file" not in request.files:
        return jsonify({"error": "Niciun fișier trimis"}), 400

    file = request.files["file"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Fișier invalid. Trimite un fișier Excel (.xlsx)"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    try:
        df = pd.read_excel(file_path)

        # Coloanele necesare
        required_columns = {"name", "email", "groupName", "specialization", "year_of_study"}
        if not required_columns.issubset(df.columns):
            return jsonify(
                {"error": "Fișierul trebuie să conțină: name, email, groupName, specialization, year_of_study"}), 400

            # Obținem emailurile
        email_list = df['email'].dropna().astype(str)

        # Verificăm dacă toate emailurile sunt de forma @student.usv.ro
        invalid_emails = [email for email in email_list if not email.endswith("@student.usv.ro")]

        if invalid_emails:
            return jsonify({
                "msg": "Fișierul conține emailuri invalide.",
                "invalid_emails": invalid_emails
            }), 400

        users_added = 0
        for _, row in df.iterrows():
            if pd.isna(row["name"]) or pd.isna(row["email"]):
                continue

            # role_value = row["role"].strip().upper()

            # Verificăm dacă utilizatorul există deja
            existing_user = User.query.filter_by(email=row["email"]).first()
            if not existing_user:
                user = User(
                    name=row["name"],
                    email=row["email"],
                    role=UserRole.SG
                )
                db.session.add(user)

                # Dacă utilizatorul este SG, creăm și grupa aferentă
                # if role_value == "SG":
                # Asigură-te că groupName este tratat ca un șir de caractere
                group_name = str(int(row["groupName"]))  # Convertește la întreg și apoi la string

                # Verificăm dacă grupa există deja
                existing_group = Group.query.filter_by(name=group_name).first()

                if not existing_group:
                    # Dacă grupa nu există, creăm o nouă grupă
                    group = Group(
                        name=group_name,
                        specialization=row["specialization"],
                        year_of_study=row["year_of_study"],
                        leader_id=user.user_id  # Setăm utilizatorul ca lider
                    )
                    db.session.add(group)
                    db.session.commit()  # Este important să facem commit pentru a salva grupa în BD

                users_added += 1  # Incrementăm contorul pentru utilizatori adăugați

        db.session.commit()
        return jsonify({"message": f"{users_added} utilizatori adăugați cu succes"}), 201

    except Exception as e:
        return jsonify({"error": f"Eroare la procesarea fișierului: {str(e)}"}), 500


@upload_bp.route("/sync-data", methods=["POST"])
@roles_required("SEC")
@swag_from({
    'tags': ['Upload'],
    'summary': 'Sincronizare date externe',
    'description': 'Apelează API-urile externe și salvează profesorii, cursurile si salile disponibile în baza de date. Doar pentru ADMIN.',
    'responses': {
        200: {
            'description': 'Datele au fost sincronizate cu succes.'
        },
        403: {
            'description': 'Acces interzis. Doar adminul poate accesa această rută.'
        },
        500: {
            'description': 'Eroare la sincronizare.'
        }
    },
    'security': [{
        'Bearer': []
    }]
})
def sync_data():
    app = current_app._get_current_object()
    threading.Thread(target=run_sync, args=(app,)).start()
    return jsonify({"msg": "Sincronizarea a fost pornită în fundal."}), 202


def run_sync(app):
    with app.app_context():
        try:
            fetch_and_store_data()

            try:
                send_email_notification(
                    to="ancuta.cirlan1@student.usv.ro",
                    subject="Incarcare date - profesori",
                    body="S-au incarcat datele necesare pentru programarea examenelor. "
                         "Intrati in aplicatie si setati metoda de evaluare pentru cursurile la care sunteti coordonator."

                )
                print("✅Email catre profesor trims ")

            except Exception as e:
                print(f"⚠️ Email catre profesor: {e}")

            try:
                send_email_notification(
                    to="ancuta.cirlan1@student.usv.ro",
                    subject="Incarcare date - studenti",
                    body="S-au incarcat datele necesare pentru programarea examenelor. "
                         "Intrati in aplicatie si alegeti datele pentru examen."
                )
                print("✅Email catre student trims ")

            except Exception as e:
                print(f"⚠️ Email catre student eșuat: {e}")

            print("✅ Sincronizare completă.")

        except Exception as e:
            print(f"❌ Eroare în sincronizare: {e}")
