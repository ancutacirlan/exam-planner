from flask import Blueprint, jsonify
from flasgger import swag_from
from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required, current_user
from sqlalchemy.sql.functions import user

from app import db

from app.decorators import roles_required
from app.models import User, Group, Course, UserRole, ExamType

courses_bp = Blueprint("courses", __name__)

@courses_bp.route("/courses", methods=["GET"])
@roles_required("CD","SEC","SG")
@swag_from({
    'tags': ['Cursuri'],
    'summary': 'Vizualizare cursuri în funcție de rol',
    'description': 'Returnează cursurile relevante pentru student (SG), profesor (CD) sau secretar (SEC).',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Listă de cursuri',
            'examples': {
                'application/json': [
                    {
                        "id": 1,
                        "name": "Programare",
                        "examination_method": "oral",
                        "specialization": "CS",
                        "study_year": 1
                    }
                ]
            }
        },
        403: {
            'description': 'Acces interzis. Rol insuficient.'
        }
    }
})
def get_courses_by_role():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilizatorul nu a fost găsit."}), 404

    # Secretar: vede toate cursurile
    if user.role == UserRole.SEC:
        courses = Course.query.all()

    # Profesor coordonator: vede doar cursurile coordonate de el
    elif user.role == UserRole.CD:
        courses = Course.query.filter_by(coordinator_id=user_id).all()

    # Student lider: vede cursurile grupei
    elif user.role == UserRole.SG:
        group = Group.query.filter_by(leader_id=user.user_id).first()
        if not group:
            return jsonify({"error": "Studentul nu este asociat unui grup."}), 404
        courses = Course.query.filter_by(
            specialization=group.specialization,
            study_year=group.year_of_study
        ).all()

    else:
        return jsonify({"error": "Rolul utilizatorului nu are acces la această resursă."}), 403

    course_list = [{
        "id": c.course_id,
        "name": c.name,
        "examination_method": c.examination_method,
        "specialization": c.specialization,
        "study_year": c.study_year
    } for c in courses]

    return jsonify(course_list), 200


@courses_bp.route("/courses/<int:course_id>/set-examination-method", methods=["PUT"])
@jwt_required()
@roles_required("CD","SEC")
@swag_from({
    'tags': ['Cursuri'],
    'summary': 'Setează metoda de examinare pentru un curs',
    'description': 'Permite CD sau SEC să seteze metoda de examinare pentru un curs.',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'course_id',
            'in': 'path',
            'required': True,
            'type': 'integer',
            'description': 'ID-ul cursului'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'examination_method': {'type': 'string'}
                },
                'required': ['examination_method']
            }
        }
    ],
    'responses': {
        200: {'description': 'Metoda de examinare actualizată cu succes.'},
        400: {'description': 'Metodă invalidă.'},
        403: {'description': 'Acces interzis.'},
        404: {'description': 'Cursul nu a fost găsit.'}
    }
})
def set_examination_method(course_id):

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    data = request.get_json()
    new_method = data.get("examination_method")
    print(user.role)
    print(str(UserRole.SEC))
    print(user.role == str(UserRole.CD))
    print(user.role == UserRole.CD)
    # Validăm metoda de examinare
    valid_methods = [et.value for et in ExamType]
    if not new_method or new_method not in valid_methods:
        return {
            "error": f"Metodă invalidă. Valori posibile: {valid_methods}"
        }, 400

    course = Course.query.get(course_id)
    if not course:
        return {"error": "Cursul nu a fost găsit."}, 404

    # Verificăm dacă CD este coordonatorul cursului
    if user.role == UserRole.CD and course.coordinator_id != user.user_id:
        return {"error": "Nu ești coordonatorul acestui curs."}, 403

    course.examination_method = new_method
    db.session.commit()

    return {"message": "Metoda de examinare a fost actualizată cu succes."}, 200

@courses_bp.route("/courses/<int:course_id>", methods=["GET"])
@jwt_required()
@swag_from({
    'tags': ['Cursuri'],
    'summary': 'Obține informații despre un curs',
    'description': 'Returnează date despre un curs, filtrate în funcție de rolul utilizatorului (CD,SG,SEC).',
    'parameters': [
        {
            'name': 'course_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID-ul cursului de căutat'
        }
    ],
    'responses': {
        200: {
            'description': 'Informațiile cursului',
            'examples': {
                'application/json': {
                    'course_id': 5,
                    'name': 'Programare Avansată',
                    'specialization': 'CTI',
                    'study_year': 2,
                    'coordinator': 'Popescu Ana',
                    'assistants': ['Ionescu Radu', 'Marin Elena']
                }
            }
        },
        403: {'description': 'Acces interzis pentru acest curs'},
        404: {'description': 'Cursul sau utilizatorul nu există'}
    }
})
def get_course_by_id(course_id):
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    course = db.session.get(Course, course_id)

    if not user or not course:
        return jsonify({'message': 'Utilizatorul sau cursul nu a fost găsit'}), 404

    # Verificări de rol și acces
    if user.role == UserRole.ADM or user.role == UserRole.SEC:
        pass  # Are acces complet
    elif user.role == UserRole.CD:
        if course.coordinator_id != user.user_id:
            return jsonify({'message': 'Acces interzis'}), 403
    elif  user.role == UserRole.SG:
        group = user.led_groups[0] if user.led_groups else None
        if not group:
            return jsonify({"message": "Nu ești lider de grup"}), 403

        if group.specialization != course.specialization or group.year_of_study != course.study_year:
            return jsonify({
                "message": "Grupa ta nu corespunde cu specializarea sau anul de studiu al cursului"
            }), 403
    else:
        return jsonify({'message': 'Rol necunoscut'}), 403

    response = {
        'course_id': course.course_id,
        'name': course.name,
        'specialization': course.specialization,
        'study_year': course.study_year,
        'coordinator': course.coordinator.name if course.coordinator else None,
        'assistants': [a.name for a in course.assistants]
    }
    return jsonify(response), 200

@courses_bp.route('/courses/<int:course_id>', methods=['PUT'])
@jwt_required()
@roles_required("SEC")
@swag_from({
    'tags': ['Cursuri'],
    'summary': 'Editare curs (doar pentru secretariat)',
    'description': 'Permite secretariatului să editeze orice câmp al unui curs, inclusiv asistenții.',
    'parameters': [
        {
            'name': 'course_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID-ul cursului de modificat'
        },
        {
            'name': 'body',
            'in': 'body',
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'study_year': {'type': 'integer'},
                    'specialization': {'type': 'string'},
                    'coordinator_id': {'type': 'integer'},
                    'examination_method': {'type': 'string', 'enum': ['EXAMEN', 'COLOCVIU']},
                    'assistant_ids': {
                        'type': 'array',
                        'items': {'type': 'integer'}
                    }
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Cursul a fost actualizat cu succes'},
        403: {'description': 'Acces interzis'},
        404: {'description': 'Cursul nu a fost găsit'},
        400: {'description': 'Date invalide'}
    }
})
def edit_course(course_id):

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"message": "Cursul nu a fost găsit"}), 404

    data = request.get_json()

    if 'name' in data:
        course.name = data['name']

    if 'study_year' in data:
        course.study_year = data['study_year']

    if 'specialization' in data:
        course.specialization = data['specialization']

    if 'examination_method' in data:
        method = data['examination_method']
        if method not in [e.value for e in ExamType]:
            return jsonify({"message": "Tip de examinare invalid"}), 400
        course.examination_method = method

    if 'coordinator_id' in data:
        new_coordinator = User.query.get(data['coordinator_id'])
        if not new_coordinator or new_coordinator.role != UserRole.CD:
            return jsonify({"message": "Coordonator invalid sau inexistent"}), 400
        course.coordinator_id = new_coordinator.user_id

    if 'assistant_ids' in data:
        assistants = User.query.filter(User.user_id.in_(data['assistant_ids'])).all()
        valid_assistants = [u for u in assistants if u.role == UserRole.CD]

        if len(valid_assistants) != len(data['assistant_ids']):
            return jsonify({"message": "Unul sau mai mulți asistenți sunt invalizi sau nu au rolul corect"}), 400

        course.assistants = valid_assistants

    db.session.commit()
    return jsonify({"message": "Cursul a fost actualizat cu succes"}), 200
