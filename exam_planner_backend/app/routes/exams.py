from datetime import datetime, date, timedelta

from flasgger import swag_from
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, current_user
from sqlalchemy import and_
from sqlalchemy.orm import joinedload

from app.decorators import roles_required
from app.email import send_email_notification
from app.models import ExaminationPeriod, db, UserRole, Group, User, Course, Exam, ExamStatus, Room, ExamType

exams_bp = Blueprint("exam", __name__, url_prefix="/exam")


def overlaps(start1, dur1, start2, dur2):
    # Verificăm și convertim start1 și start2 la obiecte 'time' dacă sunt șiruri
    if isinstance(start1, str):
        start1 = datetime.strptime(start1, "%H:%M").time()
    if isinstance(start2, str):
        start2 = datetime.strptime(start2, "%H:%M").time()

    # Converim 'start1' și 'start2' în obiecte datetime pentru a le compara
    s1 = datetime.combine(date.today(), start1)
    e1 = s1 + timedelta(minutes=dur1)
    s2 = datetime.combine(date.today(), start2)
    e2 = s2 + timedelta(minutes=dur2)

    # Verificăm dacă există o suprapunere
    return s1 < e2 and s2 < e1


@exams_bp.route("/propose", methods=["POST"])
@jwt_required()
@roles_required("SG")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Propune o dată pentru un examen',
    'description': 'Permite unui lider de grup (SG) să propună o dată pentru un examen sau colocviu. Profesorul titular va fi notificat prin email.',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'course_id': {'type': 'integer', 'example': 3},
                    'exam_date': {'type': 'string', 'format': 'date', 'example': '2025-06-10'},
                },
                'required': ['course_id', 'group_id', 'exam_date', 'type']
            }
        }
    ],
    'responses': {
        '201': {
            'description': 'Propunerea a fost salvată și notificarea trimisă.'
        },
        '400': {
            'description': 'Cerere invalidă (ex: dată în afara perioadei de examinare)'
        },
        '403': {
            'description': 'Utilizatorul nu este liderul grupului.'
        },
        '409': {
            'description': 'Examenul pentru aceasta disciplina a fost deja propus.'
        }
    }
})
# doar SG poate face propuneri
def exam_date_propose():
    data = request.get_json()
    user_id = get_jwt_identity()

    # 1. Validare date
    course_id = data.get("course_id")
    exam_date_str = data.get("exam_date")
    if not course_id or not exam_date_str:
        return jsonify({"msg": "course_id și exam_date sunt necesare"}), 400

    try:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"msg": "Formatul datei trebuie să fie YYYY-MM-DD"}), 400

    # 2. Obține user, curs și grup
    user = User.query.get(user_id)
    course = Course.query.get(course_id)
    group = Group.query.filter_by(leader_id=user_id).first()

    if not group:
        return jsonify({"msg": "Nu ești liderul niciunei grupe."}), 403

    if not course:
        return jsonify({"msg": "Cursul nu a fost găsit."}), 404

    if not course.examination_method:
        return jsonify({"msg": "Cursul nu are o metodă de examinare setată."}), 400

        # Verificăm perioada de examinare validă
    perioada = ExaminationPeriod.query.filter(
        ExaminationPeriod.period_start <= exam_date,
        ExaminationPeriod.period_end >= exam_date,
        ExaminationPeriod.name == course.examination_method
    ).first()

    if not perioada:
        return jsonify({"error": "Data nu este într-o perioadă de examinare validă."}), 400

    existing_exam = Exam.query.filter_by(course_id=course_id, group_id=group.group_id).first()
    if existing_exam:
        return jsonify({"error": "Examenul pentru aceasta disciplina a fost deja propus."}), 409
    # 3. Creează examen
    exam = Exam(
        course_id=course.course_id,
        group_id=group.group_id,
        exam_date=exam_date,
        type=course.examination_method,
        professor_id=course.coordinator_id,
        status=ExamStatus.IN_ASTEPTARE
    )
    db.session.add(exam)
    db.session.commit()

    # # Trimitem notificare email către coordonator
    profesor = course.coordinator
    print(profesor)

    # de scos
    try:
        send_email_notification(
            to="ancuta.cirlan1@student.usv.ro",
            subject="Propunere nouă pentru dată de examen",
            body=f"{user.name} din grupa {group.name} a propus o dată pentru cursul {course.name}.\n"
                 f"Data propusă: {exam_date.strftime('%d.%m.%Y')}"
        )
    except Exception as e:
        return jsonify({"warning": "Propunerea a fost salvată, dar notificarea nu a putut fi trimisă."}), 201

    # try:
    #     send_email_notification(
    #         to=profesor.email,
    #         subject="Propunere nouă pentru dată de examen",
    #         body=f"{sg_user.name} din grupa {group.name} a propus o dată pentru cursul {course.name}.\n"
    #              f"Data propusă: {exam_date.strftime('%d.%m.%Y')}"
    #     )
    # except Exception as e:
    #     return jsonify({"warning": "Propunerea a fost salvată, dar notificarea nu a putut fi trimisă."}), 201

    return jsonify({"message": "Propunerea a fost salvată și notificarea trimisă."}), 201


@exams_bp.route("/review", methods=["PUT"])
@roles_required("CD")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Acceptă sau respinge o propunere de examen',
    'description': 'CD-ul poate accepta sau respinge propunerea unui examen. Dacă este acceptată, trebuie completate informațiile despre sală, asistent, oră și durată.',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'exam_id': {'type': 'integer', 'description': 'ID-ul propunerii de examen', 'example': 5},
                    'decision': {'type': 'string', 'enum': ['ACCEPTAT', 'RESPINS'],
                                 'description': 'Decizia asupra propunerii'},
                    'room_id': {'type': 'integer', 'description': 'ID-ul sălii', 'example': 1},
                    'assistant_id': {'type': 'integer', 'description': 'ID-ul asistentului', 'example': 3},
                    'start_time': {'type': 'string', 'description': 'Ora începerii examenului (HH:MM)',
                                   'example': '09:30'},
                    'duration': {'type': 'integer', 'description': 'Durata examenului în minute', 'example': 120},
                    'details': {'type': 'string', 'description': 'Detalii suplimentare despre examen',
                                'example': 'Se permite laptop'}
                },
                'required': ['exam_id', 'decision']
            }
        }
    ],
    'responses': {
        200: {'description': 'Decizia a fost înregistrată cu succes'},
        400: {'description': 'Date invalide sau incomplete'},
        404: {'description': 'Examenul sau datele nu au fost găsite'},
        409: {'description': 'Conflicte de programare (sală/asistent/profesor)'}
    }
})

def review_exam_proposal():
    data = request.get_json()
    exam_id = data.get("exam_id")

    if not exam_id:
        return jsonify({"msg": "Lipseste exam_id"}), 400

    exam = Exam.query.get_or_404(exam_id)

    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if exam.status != ExamStatus.IN_ASTEPTARE:
        return jsonify({"msg": "Propunerea a fost acceptată și actualizată."}), 400

    decision = data.get("decision")

    if decision == "ACCEPTAT":
        # Validări pentru sală, asistent, start_time, duration
        room_id = data.get("room_id")
        assistant_id = data.get("assistant_id")
        start_time_str = data.get("start_time")
        duration = data.get("duration")
        details = data.get("details", "")

        if not all([room_id, assistant_id, start_time_str, duration]):
            return jsonify({"msg": "Lipsesc câmpuri obligatorii pentru acceptare."}), 400

        try:
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
        except ValueError:
            return jsonify({"msg": "Format oră invalid. Se așteaptă HH:MM"}), 400

        # Verificare existență sală
        room = Room.query.get(room_id)
        if not room:
            return jsonify({"msg": "Sala selectată nu există."}), 404

        # Verificare existență asistent
        assistant = User.query.get(assistant_id)
        if not assistant or assistant.role != UserRole.CD:
            return jsonify({"msg": "Asistentul selectat nu este valid."}), 404

        def overlaps(start1, dur1, start2, dur2):
            # Verificăm și convertim start1 și start2 la obiecte 'time' dacă sunt șiruri
            if isinstance(start1, str):
                start1 = datetime.strptime(start1, "%H:%M").time()
            if isinstance(start2, str):
                start2 = datetime.strptime(start2, "%H:%M").time()

            # Converim 'start1' și 'start2' în obiecte datetime pentru a le compara
            s1 = datetime.combine(date.today(), start1)
            e1 = s1 + timedelta(minutes=dur1)
            s2 = datetime.combine(date.today(), start2)
            e2 = s2 + timedelta(minutes=dur2)

            # Verificăm dacă există o suprapunere
            return s1 < e2 and s2 < e1

        # Verificare sală
        room_conflicts = Exam.query.filter(
            and_(
                Exam.room_id == room_id,
                Exam.exam_date == exam.exam_date,
                Exam.exam_id != exam.exam_id,
                Exam.status == ExamStatus.ACCEPTAT
            )
        ).all()

        for e in room_conflicts:
            if overlaps(start_time, duration, e.start_time, e.duration):
                return jsonify({"msg": "Sala este ocupata in acest interval de timp."}), 409

        # Verificare asistent
        assistant_conflicts = Exam.query.filter(
            and_(
                Exam.assistant_id == assistant_id,
                Exam.exam_date == exam.exam_date,
                Exam.exam_id != exam.exam_id,
                Exam.status == ExamStatus.ACCEPTAT

            )
        ).all()

        for e in assistant_conflicts:
            if overlaps(start_time, duration, e.start_time, e.duration):
                return jsonify({"msg": "Asistentul este ocupat in intervalul propus."}), 409

        # Verificare profesor
        prof_conflicts = Exam.query.filter(
            and_(
                Exam.professor_id == current_user.user_id,
                Exam.exam_date == exam.exam_date,
                Exam.exam_id != exam.exam_id,
                Exam.status == ExamStatus.ACCEPTAT

            )
        ).all()

        for e in prof_conflicts:
            if overlaps(start_time, duration, e.start_time, e.duration):
                return jsonify({"msg": "Aveti un alt examen acceptat in intervalul propus"}), 409

        # Acceptare finală
        exam.status = ExamStatus.ACCEPTAT
        exam.room_id = room_id
        exam.assistant_id = assistant_id
        exam.professor_id = current_user.user_id
        exam.start_time = start_time
        exam.duration = duration
        exam.details = details

        db.session.commit()

        course = Course.query.get(exam.course_id);

        # Notificare SG
        sg = User.query.get(Group.query.get(exam.group_id).leader_id)
        send_email_notification(
            # to=sg.email,
            to="ancuta.cirlan1@student.usv.ro",
            subject="Examen aprobat",
            body=f"Data propusă pentru examenul la '{course.name}' a fost acceptată.\n"
                 f"data: {exam.exam_date} \n "
                 f"ora: {exam.start_time} \n"
                 f"durata: {exam.duration} min \n"
                 f"detalii: {exam.details}. \n"
                 f"prof. asistent: {assistant.name}. \n"
        )

        return jsonify({"msg": "Examenul a fost actualizat."}), 200

    elif decision == "RESPINS":
        details = data.get("details", "")

        exam.status = ExamStatus.RESPINS
        exam.details = details

        db.session.commit()

        course = Course.query.get(exam.course_id)

        # Notificare SG
        sg = User.query.get(Group.query.get(exam.group_id).leader_id)
        send_email_notification(
            # to=sg.email,
            to="ancuta.cirlan1@student.usv.ro",
            subject="Propunere respinsă",
            body=f"Data propusă pentru examenul '{course.name}' a fost respinsă de profesor. Alegeti o alta data."
                 f"\nalte detalii: {exam.details}. \n"
        )

        return jsonify({"msg": "Propunerea a fost respinsa si studentul a fost notificat."}), 200

    else:
        return jsonify({"msg": "Decizie invalida. Statusul poate fi doar 'ACCEPTAT' sau 'RESPINS'."}), 400


@exams_bp.route("/by-status", methods=["GET"])
@roles_required("CD")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Vizualizează toate examenele coordonate, grupate pe status',
    'description': 'Returnează toate examenele (indiferent de status) asociate cursurilor pe care le coordonează utilizatorul autentificat.',
    'responses': {
        200: {
            'description': 'Examenele grupate pe status',
            'examples': {
                'application/json': {
                    "IN_ASTEPTARE": [
                        {
                            "exam_id": 4,
                            "course_name": "Creativitate ştiinţifică",
                            "group_name": "3711",
                            "specialization": "Calculatoare",
                            "exam_date": "2025-07-09",
                            "start_time": None,
                            "duration": None,
                            "room": None,
                            "building": None,
                            "type": "EXAMEN",
                            "status": "IN_ASTEPTARE"
                        }
                    ],
                    "ACCEPTAT": [
                        {
                            "exam_id": 5,
                            "course_name": "Curs 2",
                            "group_name": "3711",
                            "specialization": "Calculatoare",
                            "exam_date": "2025-07-10",
                            "start_time": "10:00",
                            "duration": 120,
                            "room": "C203",
                            "building": "C",
                            "type": "EXAMEN",
                            "status": "ACCEPTAT"
                        }
                    ],
                    "RESPINS": [
                        {
                            "exam_id": 6,
                            "course_name": "Rețele neuronale",
                            "group_name": "3711",
                            "specialization": "Calculatoare",
                            "exam_date": "2025-07-01",
                            "start_time": "14:00",
                            "duration": 90,
                            "room": "B102",
                            "building": "B",
                            "type": "EXAMEN",
                            "status": "RESPINS"
                        }
                    ]
                }
            },
            'schema': {
                'type': 'object',
                'properties': {
                    'IN_ASTEPTARE': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'exam_id': {'type': 'integer'},
                                'course_name': {'type': 'string'},
                                'group_name': {'type': 'string'},
                                'specialization': {'type': 'string'},
                                'exam_date': {'type': 'string', 'format': 'date'},
                                'start_time': {'type': ['string', 'null']},
                                'duration': {'type': ['integer', 'null']},
                                'room': {'type': ['string', 'null']},
                                'building': {'type': ['string', 'null']},
                                'type': {'type': 'string'},
                                'status': {'type': 'string'}
                            }
                        }
                    },
                    'ACCEPTAT': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'exam_id': {'type': 'integer'},
                                'course_name': {'type': 'string'},
                                'group_name': {'type': 'string'},
                                'specialization': {'type': 'string'},
                                'exam_date': {'type': 'string', 'format': 'date'},
                                'start_time': {'type': ['string', 'null']},
                                'duration': {'type': ['integer', 'null']},
                                'room': {'type': ['string', 'null']},
                                'building': {'type': ['string', 'null']},
                                'type': {'type': 'string'},
                                'status': {'type': 'string'}
                            }
                        }
                    },
                    'RESPINS': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'exam_id': {'type': 'integer'},
                                'course_name': {'type': 'string'},
                                'group_name': {'type': 'string'},
                                'specialization': {'type': 'string'},
                                'exam_date': {'type': 'string', 'format': 'date'},
                                'start_time': {'type': ['string', 'null']},
                                'duration': {'type': ['integer', 'null']},
                                'room': {'type': ['string', 'null']},
                                'building': {'type': ['string', 'null']},
                                'type': {'type': 'string'},
                                'status': {'type': 'string'}
                            }
                        }
                    }
                }
            }
        },
        403: {
            'description': 'Acces interzis - utilizatorul nu are rolul corespunzător'
        }
    }
})


def get_exams_by_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or user.role != UserRole.CD:
        return jsonify({"msg": "Acces interzis"}), 403

    # Toate examenele de la cursurile unde e coordonator
    exams = (
        Exam.query
        .join(Course)
        .filter(Course.coordinator_id == user.user_id)
        .options(joinedload(Exam.course), joinedload(Exam.group), joinedload(Exam.room))
        .all()
    )

    grouped_exams = {"IN_ASTEPTARE": [], "ACCEPTAT": [], "RESPINS": []}

    for exam in exams:
        status = exam.status.name if exam.status else "IN_ASTEPTARE"
        grouped_exams[status].append({
            "exam_id": exam.exam_id,
            "course_name": exam.course.name if exam.course else None,
            "group_name": exam.group.name if exam.group else None,
            "specialization": exam.course.specialization if exam.course else None,
            "exam_date": exam.exam_date.isoformat() if exam.exam_date else None,
            "start_time": exam.start_time.strftime("%H:%M") if exam.start_time else None,
            "duration": exam.duration,
            "room": exam.room.name if exam.room else None,
            "building": exam.room.building if exam.room else None,
            "type": exam.type,
            "status": status
        })

    return jsonify(grouped_exams), 200


@exams_bp.route('/for/group', methods=['GET'])
@roles_required("SG")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Vezi toate examenele grupei tale',
    'description': 'Permite șefului de grupa să vadă toate examenele grupei sale cu toate detaliile (cursuri, profesori, săli etc.).',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Lista examenelor pentru seful de grupa',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'exam_id': {'type': 'integer'},
                        'course_name': {'type': 'string'},
                        'exam_type': {'type': 'string'},
                        'exam_date': {'type': 'string', 'format': 'date'},
                        'start_time': {'type': 'string', 'format': 'time'},
                        'duration': {'type': 'integer'},
                        'room': {'type': 'string'},
                        'building': {'type': 'string'},
                        'professor': {'type': 'string'},
                        'assistant': {'type': 'string'},
                        'status': {'type': 'string'},
                        'details': {'type': 'string'}
                    }
                }
            }
        },
        403: {
            'description': 'Acces interzis. Trebuie să fiți șef de grup pentru a accesa examenele.'
        },
        404: {
            'description': 'Grupa nu a fost găsita.'
        }
    }
})
def get_group_exams():
    # Obținem ID-ul utilizatorului (șeful de grup) din token-ul JWT
    current_user_id = get_jwt_identity()

    # Verificăm dacă utilizatorul are rolul de șef de grup (SG)
    user = User.query.get(current_user_id)

    # Obținem grupul de care este responsabil șeful de grup
    group = Group.query.filter_by(leader_id=current_user_id).first()
    if not group:
        return jsonify({"msg": "Grupa asignata sefului de grupa nu a fost găsita."}), 404

    # Preluăm examenele pentru grupul respectiv
    exams = db.session.query(Exam).filter_by(group_id=group.group_id). \
        options(joinedload(Exam.course), joinedload(Exam.room), joinedload(Exam.professor),
                joinedload(Exam.assistant)).all()

    # Formăm lista de examene și detalii relevante
    exam_details = []
    for exam in exams:
        exam_info = {
            "exam_id": exam.exam_id,
            "course_name": exam.course.name,
            "exam_type": str(exam.type),
            "exam_date": exam.exam_date.strftime("%Y-%m-%d") if exam.exam_date else None,
            "start_time": exam.start_time.strftime("%H:%M") if exam.start_time else None,
            "duration": exam.duration if exam.duration is not None else None,
            "room": exam.room.name if exam.room else None,
            "building": exam.room.building if exam.room else None,
            "professor": exam.professor.name if exam.professor else None,
            "assistant": exam.assistant.name if exam.assistant else None,
            "status": exam.status.value if exam.status else None,
            "details": exam.details if exam.details else None
        }
        exam_details.append(exam_info)

    # Returnăm lista cu toate examenele
    return jsonify(exam_details), 200


@exams_bp.route("/<int:exam_id>/update-date", methods=["PATCH"])
@roles_required("SG")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Modifică data unui examen respins',
    'description': 'Permite șefului de grup să reprogrameze un examen respins. Trimite notificare prin email coordonatorului cursului.',
    'parameters': [
        {
            'name': 'exam_id',
            'in': 'path',
            'required': True,
            'type': 'integer',
            'description': 'ID-ul examenului ce trebuie reprogramat'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'exam_date': {
                        'type': 'string',
                        'format': 'date',
                        'example': '2025-06-01'
                    }
                },
                'required': ['exam_date']
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Data examenului a fost actualizată cu succes.'
        },
        400: {
            'description': 'Cerere invalidă.'
        },
        403: {
            'description': 'Acces interzis.'
        },
        404: {
            'description': 'Examenul sau grupa nu a fost găsit(ă).'
        }
    }
})
def reschedule_exam(exam_id):
    current_user_id = get_jwt_identity()

    # Verificăm grupa asociată șefului de grup
    group = Group.query.filter_by(leader_id=current_user_id).first()
    if not group:
        return jsonify({"msg": "Grupa asociată nu a fost găsită."}), 404

    # Căutăm examenul și verificăm dacă este pentru grupa șefului
    exam = Exam.query.filter_by(exam_id=exam_id, group_id=group.group_id).options(
        joinedload(Exam.course).joinedload(Course.coordinator)
    ).first()

    if not exam:
        return jsonify({"msg": "Examenul nu a fost găsit sau nu aparține grupei tale."}), 404

    if exam.status.name != "RESPINS":
        return jsonify({"msg": "Poți modifica doar examenele respinse."}), 400

    data = request.get_json()
    new_date_str = data.get("exam_date")

    try:
        new_date = datetime.strptime(new_date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return jsonify({"msg": "Formatul datei este invalid. Folosește YYYY-MM-DD."}), 400

    course = exam.course
    coordinator = course.coordinator

    perioada = ExaminationPeriod.query.filter(
        ExaminationPeriod.period_start <= new_date_str,
        ExaminationPeriod.period_end >= new_date_str,
        ExaminationPeriod.name == course.examination_method
    ).first()

    if not perioada:
        return jsonify({"error": "Data nu este într-o perioadă de examinare validă."}), 400

    # Actualizăm data
    exam.exam_date = new_date
    exam.status = ExamStatus.IN_ASTEPTARE
    db.session.commit()

    # Trimite email către coordonator
    if coordinator and coordinator.email:
        send_email_notification(
            # to=coordinator.email,
            to="ancuta.cirlan1@student.usv.ro",
            subject="Examen modificat - notificare",
            body=f"""
                Buna ziua {coordinator.name},
                Șeful grupei {exam.group.name} a modificat data pentru examenul "{course.name}".
                Noua dată propusă: {new_date.strftime('%Y-%m-%d')}.
                Te rugăm să verifici noua propunere în platformă.
                Mulțumim!
                """,
        )

    return jsonify({"message": "Data examenului a fost modificată și coordonatorul a fost notificat."})


@exams_bp.route("/<int:exam_id>", methods=["GET"])
@roles_required("CD", "SG", "SEC")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Obține detalii despre un examen',
    'description': 'Returnează informații despre un examen în funcție de rolul utilizatorului (secretar, cadru didactic, șef de grupă).',
    'parameters': [
        {
            'name': 'exam_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID-ul examenului de căutat'
        }
    ],
    'responses': {
        200: {
            'description': 'Examen găsit',
            'examples': {
                'application/json': {
                    "assistant": "Adina Luminiţa Bărîlă",
                    "building": "C",
                    "course_name": "Curs 2",
                    "details": "Se permite laptop",
                    "duration": 120,
                    "exam_date": "2025-07-10",
                    "exam_id": 5,
                    "exam_type": "EXAMEN",
                    "professor": "Maria Ionescu",
                    "room": "C203",
                    "start_time": "09:30",
                    "status": "ACCEPTAT"
                }
            }
        },
        403: {
            'description': 'Acces interzis pentru acest examen'
        },
        404: {
            'description': 'Examenul sau utilizatorul nu a fost găsit'
        }
    }
})
def get_exam(exam_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"error": "Utilizator inexistent."}), 404

    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": "Examenul nu a fost găsit."}), 404

    # Rol: secretar → poate vedea tot
    if user.role == UserRole.SEC:
        return jsonify(exam_to_dict(exam)), 200

    # Rol: profesor
    if user.role == UserRole.CD:
        if exam.professor_id == user.user_id:
            return jsonify(exam_to_dict(exam)), 200
        else:
            return jsonify({"error": "Nu ai acces la acest examen."}), 403

    # Rol: sef de grupă
    if user.role == UserRole.SG:
        group_led = Group.query.filter_by(leader_id=user.user_id).first()
        if exam.group_id == group_led.group_id:
            return jsonify(exam_to_dict(exam)), 200
        else:
            return jsonify({"error": "Nu ești liderul acestui grup."}), 403

    return jsonify({"error": "Rolul tău nu are acces la acest examen."}), 403


def exam_to_dict(exam):
    return {
        "exam_id": exam.exam_id,
        "course_name": exam.course.name,
        "exam_type": str(exam.type),
        "exam_date": exam.exam_date.strftime("%Y-%m-%d") if exam.exam_date else None,
        "start_time": exam.start_time.strftime("%H:%M") if exam.start_time else None,
        "duration": exam.duration if exam.duration is not None else None,
        "room": exam.room.name if exam.room else None,
        "building": exam.room.building if exam.room else None,
        "professor": exam.professor.name if exam.professor else None,
        "assistant": exam.assistant.name if exam.assistant else None,
        "status": exam.status.value if exam.status else None,
        "details": exam.details if exam.details else None
    }


@exams_bp.route("/edit/<int:exam_id>", methods=["PUT"])
@roles_required("SEC")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Modifică detaliile unui examen',
    'description': 'Permite secretariatului să modifice toate detaliile examenului, inclusiv data, sala, asistentul, profesorul, durata, etc.'
                   ' Se efectuează verificări pentru conflicte de programare.',
    'parameters': [
        {
            'name': 'exam_id',
            'in': 'path',
            'required': True,
            'type': 'integer',
            'description': 'ID-ul examenului care trebuie modificat',
            'example': 1
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'exam_date': {'type': 'string', 'format': 'date', 'example': '2025-06-10'},
                    'room_id': {'type': 'integer', 'example': 1},
                    'professor_id': {'type': 'integer', 'example': 2},
                    'assistant_id': {'type': 'integer', 'example': 3},
                    'start_time': {'type': 'string', 'format': 'time', 'example': '10:00'},
                    'duration': {'type': 'integer', 'example': 120},
                    'status': {'type': 'string', 'enum': ['ACCEPTAT', 'RESPINS'], 'example': 'ACCEPTAT'},
                    'details': {'type': 'string', 'example': 'Examenul va avea loc în sala A1.'}
                },
                'required': ['exam_date', 'room_id', 'professor_id', 'assistant_id', 'start_time', 'duration', 'status']
            }
        }
    ],
    'responses': {
        '200': {
            'description': 'Examenul a fost actualizat cu succes.',
            'examples': {
                'application/json': {
                    "msg": "Examenul a fost actualizat cu succes!"
                }
            }
        },
        '400': {
            'description': 'Cerere invalidă',
            'examples': {
                'application/json': {
                    "error": "Examenul nu a fost găsit!"
                }
            }
        },
        '403': {
            'description': 'Acces interzis pentru utilizatorul curent',
            'examples': {
                'application/json': {
                    "error": "Acces interzis. Doar secretariatul poate modifica acest examen."
                }
            }
        },
        '409': {
            'description': 'Conflicte de programare (sală, asistent, profesor)',
            'examples': {
                'application/json': {
                    "msg": "Sala este ocupata in acest interval de timp."
                }
            }
        }
    }
})
def edit_exam_secretariat(exam_id):
    data = request.get_json()

    # 1. Caută examenul
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": "Examenul nu a fost găsit!"}), 404

    # 2. Validări de existență entități (dacă sunt trimise)
    if 'room_id' in data:
        room = Room.query.get(data['room_id'])
        if not room:
            return jsonify({"msg": "Sala specificată nu există."}), 404

    if 'assistant_id' in data:
        assistant = User.query.get(data['assistant_id'])
        if not assistant or assistant.role != UserRole.CD:
            return jsonify({"msg": "Asistentul nu există sau nu este cadru didactic (CD)."}), 404

    if 'professor_id' in data:
        professor = User.query.get(data['professor_id'])
        if not professor or professor.role != UserRole.CD:
            return jsonify({"msg": "Profesorul nu există sau nu este cadru didactic (CD)."}), 404

    # 3. Verifică suprapuneri dacă toate datele sunt disponibile
    def check_conflicts(user_id_field, value, entity_label):
        conflicts = Exam.query.filter(
            and_(
                getattr(Exam, user_id_field) == value,
                Exam.exam_date == data['exam_date'],
                Exam.exam_id != exam_id,
                Exam.status == ExamStatus.ACCEPTAT
            )
        ).all()

        for e in conflicts:
            if overlaps(data['start_time'], data['duration'], e.start_time, e.duration):
                return jsonify({"msg": f"{entity_label} este ocupat în intervalul propus."}), 409

    if all(k in data for k in ('exam_date', 'start_time', 'duration')):
        if 'room_id' in data:
            response = check_conflicts('room_id', data['room_id'], "Sala")
            if response: return response

        if 'assistant_id' in data:
            response = check_conflicts('assistant_id', data['assistant_id'], "Asistentul")
            if response: return response

        if 'professor_id' in data:
            response = check_conflicts('professor_id', data['professor_id'], "Profesorul")
            if response: return response

    # 4. Actualizează câmpurile
    if 'exam_date' in data:
        exam.exam_date = data['exam_date']
    if 'type' in data:
        exam.type = ExamType[data['type']]
    if 'room_id' in data:
        exam.room_id = data['room_id']
    if 'professor_id' in data:
        exam.professor_id = data['professor_id']
    if 'assistant_id' in data:
        exam.assistant_id = data['assistant_id']
    if 'status' in data:
        exam.status = ExamStatus[data['status']]
    if 'start_time' in data:
        exam.start_time = data['start_time']
    if 'duration' in data:
        exam.duration = data['duration']
    if 'details' in data:
        exam.details = data['details']

    # 5. Salvează în baza de date
    db.session.commit()

    return jsonify({"msg": "Examenul a fost actualizat cu succes!"}), 200


@exams_bp.route('/all', methods=['GET'])
@roles_required("SEC")
@swag_from({
    'tags': ['Examen'],
    'summary': 'Vezi toate examenele din sistem',
    'description': 'Permite secretarului facultății să vadă toate examenele programate dar si cele neprogramate.',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Lista completă a examenelor',
            'schema':{
  'type': 'object',
  'properties': {
    'exams_by_status': {
      'type': 'object',
      'properties': {
        'ACCEPTAT': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'exam_id': {'type': 'integer', 'example': 5},
              'course_name': {'type': 'string', 'example': 'Curs 2'},
              'group_name': {'type': 'string', 'example': '3711'},
              'exam_type': {'type': 'string', 'example': 'EXAMEN'},
              'exam_date': {'type': 'string', 'format': 'date', 'example': '2025-07-10'},
              'start_time': {'type': 'string', 'format': 'time', 'example': '10:00'},
              'duration': {'type': 'integer', 'example': 120},
              'room': {'type': 'string', 'example': 'C203'},
              'building': {'type': 'string', 'example': 'C'},
              'professor': {'type': 'string', 'example': 'Ancuta Cirlan'},
              'assistant': {'type': 'string', 'example': 'Adina Luminiţa Bărîlă'},
              'status': {'type': 'string', 'enum': ['ACCEPTAT', 'IN_ASTEPTARE', 'RESPINS'], 'example': 'ACCEPTAT'},
              'details': {'type': 'string', 'example': 'Examenul va avea loc în sala A1.'}
            }
          }
        },
        'IN_ASTEPTARE': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'exam_id': {'type': 'integer', 'example': 2},
              'course_name': {'type': 'string', 'example': 'Tehnici de invatarea automata'},
              'group_name': {'type': 'string', 'example': '3711'},
              'exam_type': {'type': 'string', 'example': 'EXAMEN'},
              'exam_date': {'type': 'string', 'format': 'date', 'example': '2025-06-10'},
              'start_time': {'type': ['string', 'null'], 'format': 'time', 'example': None},
              'duration': {'type': ['integer', 'null'], 'example': None},
              'room': {'type': ['string', 'null'], 'example': None},
              'building': {'type': ['string', 'null'], 'example': None},
              'professor': {'type': 'string', 'example': 'Ştefan Gheorghe Pentiuc'},
              'assistant': {'type': ['string', 'null'], 'example': None},
              'status': {'type': 'string', 'enum': ['ACCEPTAT', 'IN_ASTEPTARE', 'RESPINS'], 'example': 'IN_ASTEPTARE'},
              'details': {'type': ['string', 'null'], 'example': None}
            }
          }
        },
        'RESPINS': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'exam_id': {'type': 'integer', 'example': 2},
              'course_name': {'type': 'string', 'example': 'Tehnici de invatarea automata'},
              'group_name': {'type': 'string', 'example': '3711'},
              'exam_type': {'type': 'string', 'example': 'EXAMEN'},
              'exam_date': {'type': 'string', 'format': 'date', 'example': '2025-06-10'},
              'start_time': {'type': ['string', 'null'], 'format': 'time', 'example': None},
              'duration': {'type': ['integer', 'null'], 'example': None},
              'room': {'type': ['string', 'null'], 'example': None},
              'building': {'type': ['string', 'null'], 'example': None},
              'professor': {'type': 'string', 'example': 'Ştefan Gheorghe Pentiuc'},
              'assistant': {'type': ['string', 'null'], 'example': None},
              'status': {'type': 'string', 'enum': ['ACCEPTAT', 'IN_ASTEPTARE', 'RESPINS'], 'example': 'IN_ASTEPTARE'},
              'details': {'type': ['string', 'null'], 'example': None}
            }
          }
        }
      }
    },
    'missing_exams': {
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          'group': {'type': 'string', 'example': '3711'},
          'leader': {'type': 'string', 'example': 'alexandra'},
          'missing_exams': {
            'type': 'array',
            'items': {
              'type': 'object',
              'properties': {
                'course_name': {'type': 'string', 'example': 'Algoritmi paraleli avansati'},
                'coordinator': {'type': 'string', 'example': 'Remus Prodan'}
              }
            }
          }
        }
      }
    }
  }
}

        },
        403: {
            'description': 'Acces interzis. Trebuie să aveți rolul de secretar al facultății (SEC).'
        }
    }
})
def get_all_exams_and_unassigned_courses():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    courses = Course.query.options(joinedload(Course.coordinator), joinedload(Course.exams)).all()
    groups = Group.query.all()

    # Pentru fiecare curs determinăm grupele care NU au examen programat
    group_missing_exams = {}

    for course in courses:
        # Obținem grupele relevante pentru curs (în funcție de specializare și an de studiu)
        relevant_groups = [
            group for group in groups
            if group.specialization == course.specialization and group.year_of_study == course.study_year
        ]

        for group in relevant_groups:
            # Verificăm dacă există deja un examen între acest curs și grupă
            exam_exists = any(
                exam for exam in course.exams if exam.group_id == group.group_id
            )
            if not exam_exists:
                group_name = group.name
                if group_name not in group_missing_exams:
                    group_missing_exams[group_name] = []

                group_missing_exams[group_name].append({
                    "course_name": course.name,
                    "coordinator": course.coordinator.name if course.coordinator else None
                })

    # Convertim într-o listă sortată după grupă
    groups_without_exam_sorted = [
        {
            "group": group_name,
            "leader": group.leader.name if group.leader else None,
            "missing_exams": sorted(missing, key=lambda x: x["course_name"])
        }
        for group_name, missing in sorted(group_missing_exams.items(), key=lambda x: x[0])
    ]

    # Găsim toate examenele și le sortăm după status
    exams = Exam.query.options(
        joinedload(Exam.course),
        joinedload(Exam.room),
        joinedload(Exam.professor),
        joinedload(Exam.assistant),
        joinedload(Exam.group)
    ).all()

    # Pregătim examenele grupate după status
    exams_by_status = {
        "IN_ASTEPTARE": [],
        "RESPINS": [],
        "ACCEPTAT": []
    }

    for exam in exams:
        status_key = exam.status.name if exam.status else "NECUNOSCUT"

        exam_info = {
            "exam_id": exam.exam_id,
            "course_name": exam.course.name,
            "group_name": exam.group.name,
            "exam_type": str(exam.type),
            "exam_date": exam.exam_date.strftime("%Y-%m-%d") if exam.exam_date else None,
            "start_time": exam.start_time.strftime("%H:%M") if exam.start_time else None,
            "duration": exam.duration,
            "room": exam.room.name if exam.room else None,
            "building": exam.room.building if exam.room else None,
            "professor": exam.professor.name if exam.professor else None,
            "assistant": exam.assistant.name if exam.assistant else None,
            "status": exam.status.name if exam.status else None,
            "details": exam.details
        }

        # Adaugă la grupul corespunzător statusului
        if status_key in exams_by_status:
            exams_by_status[status_key].append(exam_info)
        else:
            exams_by_status[status_key] = [exam_info]  # fallback dacă apare un status necunoscut

    return jsonify({
        "missing_exams": groups_without_exam_sorted,
        "exams_by_status": exams_by_status
    }), 200


