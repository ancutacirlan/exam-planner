from datetime import datetime

from flasgger import swag_from
from flask import Blueprint, request, jsonify

from app.decorators import roles_required
from app.models import ExaminationPeriod, db, ExamType, UserRole, User, Exam, Course, Group, Room, course_assistants

settings_bp = Blueprint("settings", __name__, url_prefix="/settings")

@settings_bp.route("/examination-periods", methods=["POST"])
@swag_from({
    "tags": ["Setări"],
    "summary": "Creează o perioadă de examinare",
    "description": "Adaugă o perioadă de examinare (examen sau colocviu).",
    "security": [{"Bearer": []}],
    "parameters": [
        {
            "in": "body",
            "name": "body",
            "required": True,
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "enum": ["EXAMEN", "COLOCVIU"]},
                    "period_start": {"type": "string", "format": "date"},
                    "period_end": {"type": "string", "format": "date"},
                },
                "required": ["name", "period_start", "period_end"]
            }
        }
    ],
    "responses": {
        201: {"description": "Perioadă creată cu succes"},
        400: {"description": "Date invalide"},
        403: {"description": "Acces interzis"}
    }
})
@roles_required("ADM", "SEC")
def create_examination_period():

    data = request.get_json()
    try:
        start = datetime.strptime(data["period_start"], "%Y-%m-%d").date()
        end = datetime.strptime(data["period_end"], "%Y-%m-%d").date()

        if start >= end:
            return jsonify({"error": "Data de început trebuie să fie înainte de cea de sfârșit."}), 400

        exam_type_str = data["name"]
        if exam_type_str not in ExamType.__members__:
            raise ValueError(
                f"Tipul examenului '{exam_type_str}' nu este valid. Valori posibile: {', '.join(ExamType.__members__.keys())}")


        period = ExaminationPeriod(
            name=ExamType(exam_type_str).value,
            period_start=start,
            period_end=end
        )
        db.session.add(period)
        db.session.commit()
        return jsonify({"message": "Perioadă creată cu succes"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@settings_bp.route("/examination-periods", methods=["GET"])
@swag_from({
    "tags": ["Setări"],
    "summary": "Listează perioadele de examinare",
    "description": "Returnează toate perioadele de examinare existente.",
    "security": [{"Bearer": []}],
    "responses": {
        200: {
            "description": "Listă cu perioade",
            "schema": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "examination_period_id": {"type": "integer"},
                        "name": {"type": "string"},
                        "period_start": {"type": "string"},
                        "period_end": {"type": "string"},
                    }
                }
            }
        }
    }
})
@roles_required("ADM", "SEC", "SG", "CD")
def get_examination_periods():
    periods = ExaminationPeriod.query.all()
    return jsonify([
        {
            "examination_period_id": p.examination_period_id,
            "name": p.name,
            "period_start": p.period_start.isoformat(),
            "period_end": p.period_end.isoformat()
        } for p in periods
    ])

@settings_bp.route("/examination-periods/<int:examination_period_id>", methods=["PUT"])
@swag_from({
    "tags": ["Setări"],
    "summary": "Editează o perioadă de examinare",
    "description": "Modifică o perioadă existentă.",
    "security": [{"Bearer": []}],
    "parameters": [
        {"name": "examination_period_id", "in": "path", "type": "integer", "required": True},
        {
            "in": "body",
            "name": "body",
            "required": True,
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "enum": ["EXAMEN", "COLOCVIU"]},
                    "period_start": {"type": "string", "format": "date"},
                    "period_end": {"type": "string", "format": "date"},
                }
            }
        }
    ],
    "responses": {
        200: {"description": "Perioadă actualizată"},
        400: {"description": "Date invalide"},
        404: {"description": "Perioadă inexistentă"}
    }
})
@roles_required("ADM", "SEC")
def update_examination_period(examination_period_id):
    period = ExaminationPeriod.query.get(examination_period_id)
    if not period:
        return jsonify({"error": "Perioadă inexistentă"}), 404

    data = request.get_json()

    try:
        exam_type_str = data["name"]
        if exam_type_str not in ExamType.__members__:
            raise ValueError(
                f"Tipul examenului '{exam_type_str}' nu este valid. Valori posibile: {', '.join(ExamType.__members__.keys())}")

        period.name = ExamType(exam_type_str).value
        period.period_start = datetime.strptime(data["period_start"], "%Y-%m-%d").date()
        period.period_end = datetime.strptime(data["period_end"], "%Y-%m-%d").date()

        if period.period_start >= period.period_end:
            return jsonify({"error": "Data de început trebuie să fie înainte de cea de sfârșit."}), 400

        db.session.commit()
        return jsonify({"message": "Perioadă actualizată"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@settings_bp.route("/examination-periods/<int:examination_period_id>", methods=["DELETE"])
@swag_from({
    "tags": ["Setări"],
    "summary": "Șterge o perioadă de examinare",
    "description": "Șterge o perioadă existentă din baza de date.",
    "security": [{"Bearer": []}],
    "parameters": [
        {"name": "examination_period_id", "in": "path", "type": "integer", "required": True}
    ],
    "responses": {
        200: {"description": "Perioadă ștearsă"},
        404: {"description": "Perioadă inexistentă"}
    }
})
@roles_required("ADM", "SEC")
def delete_examination_period(examination_period_id):
    period = ExaminationPeriod.query.get(examination_period_id)
    if not period:
        return jsonify({"error": "Perioadă inexistentă"}), 404

    db.session.delete(period)
    db.session.commit()
    return jsonify({"message": "Perioadă ștearsă"}), 200


@settings_bp.route('/examination-periods/<int:period_id>', methods=['GET'])
@roles_required("ADM", "SEC","CD","SG")
@swag_from({
    'tags': ['Setări'],
    'summary': 'Obține o perioadă de examinare după ID',
    'description': 'Returnează informațiile pentru o anumită perioadă de examinare.',
    'parameters': [
        {
            'name': 'period_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID-ul perioadei de examinare'
        }
    ],
    'responses': {
        200: {'description': 'Datele perioadei au fost returnate cu succes'},
        404: {'description': 'Perioada nu a fost găsită'}
    }
})
def get_examination_period_by_id(period_id):
    period = ExaminationPeriod.query.get(period_id)
    if not period:
        return jsonify({"message": "Perioada nu a fost găsită"}), 404

    return jsonify({
        "examination_period_id": period.examination_period_id,
        "name": period.name,
        "period_start": period.period_start.isoformat(),
        "period_end": period.period_end.isoformat()
    }), 200


@settings_bp.route("/reset", methods=["POST"])
@roles_required("ADM","SEC")
@swag_from({
    'tags': ['Setări'],
    'summary': 'Resetează baza de date',
    'description': 'Șterge toate datele din baza de date, cu excepția utilizatorilor cu rol ADM și SEC.',
    'responses': {
        200: {'description': 'Resetare realizată cu succes'},
        403: {'description': 'Acces interzis'},
        500: {'description': 'Eroare la resetare'}
    }
})
def reset_database():
    try:
        # Ștergem toate înregistrările din tabelele non-user
        db.session.execute(course_assistants.delete())
        Exam.query.delete(synchronize_session=False)
        Course.query.delete(synchronize_session=False)
        Group.query.delete(synchronize_session=False)
        Room.query.delete(synchronize_session=False)
        ExaminationPeriod.query.delete(synchronize_session=False)

        # Ștergem utilizatorii care nu sunt ADM sau SEC
        User.query.filter(~User.role.in_([UserRole.ADM, UserRole.SEC])).delete(synchronize_session=False)

        db.session.commit()
        return jsonify({"message": "Resetare realizată cu succes"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Eroare la resetare", "error": str(e)}), 500
