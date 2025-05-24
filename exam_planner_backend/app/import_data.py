from flask import current_app

from app.database import db
from app.models import User, UserRole, Course, Room

API_PROFESSORS = "https://orar.usv.ro/orar/vizualizare/data/cadre.php?json"
API_COURSES = "https://orar.usv.ro/orar/vizualizare/data/orarSPG.php?ID={}&mod=prof&json"


def add_admin():
    current_app.config.get("ADMIN_EMAIL")
    user = User.query.filter_by(email=current_app.config.get("ADMIN_EMAIL")).first()
    if not user:
        user = User(
            name="Admin",
            email=current_app.config.get("ADMIN_EMAIL"),
            role=UserRole.ADM,
            teacherId=None
        )
        db.session.add(user)
        db.session.commit()


def fetch_and_store_data():
    """ Preia profesorii și cursurile asociate și le salvează în baza de date. """
    response = requests.get(API_PROFESSORS)
    if response.status_code != 200:
        print("Eroare la preluarea profesorilor")
        return

    professors = response.json()
    with current_app.app_context():
        for prof in professors:
            if prof["facultyName"] == current_app.config.get("FACULTY_NAME"):
                user = User.query.filter_by(email=prof["emailAddress"]).first()
                if not user:
                    user = User(
                        name=f"{prof['firstName']} {prof['lastName']}",
                        email=prof["emailAddress"],
                        role=UserRole.CD,
                        teacherId=int(prof["id"])
                    )
                    db.session.add(user)
                    db.session.commit()  # Salvăm profesorul în BD

                fetch_and_store_courses(user)  # Procesăm cursurile pentru fiecare profesor


import requests


def fetch_and_store_courses(professor):
    """Preia cursurile unui profesor și le salvează în BD pentru toate facultățile."""
    response = requests.get(API_COURSES.format(professor.teacherId))
    if response.status_code != 200:
        print(f"Eroare la preluarea cursurilor pentru {professor.name}")
        return

    data = response.json()
    if not data or len(data) < 2:
        return

    course_entries, course_groups = data  # Prima parte conține cursurile, a doua parte conține anii & specializările
    course_dict = {}  # Stocăm cursurile pentru a asocia laboratoarele/seminariile

    for entry in course_entries:
        topic_name = entry.get("topicLongName")
        type_short_name = entry.get("typeShortName")

        # Preluăm sau creăm sala doar dacă roomLongName nu este null
        if entry.get("roomLongName"):
            room = Room.query.filter_by(name=entry["roomLongName"]).first()
            if not room:
                room = Room(name=entry["roomLongName"], building=entry.get("roomBuilding"))
                db.session.add(room)

        # Ignorăm cursurile fără nume
        if not topic_name or type_short_name == None:
            print(f"⚠️ Curs ignorat ({'fără nume' if not topic_name else type_short_name}) pentru {professor.name} - {professor.teacherId}")
            continue

        # Extragem anul și specializarea, verificând facultatea
        study_year, specialization, faculty = extract_year_specialization_from_pair(course_groups, entry["id"])
        if study_year is None or specialization is None or faculty is None:
            print(
                f"⚠️ Curs ignorat (nu este de la {current_app.config.get('SHORT_FACULTY_NAME')}): {topic_name} - {professor.teacherId}")
            continue


        # Creăm cheia unică pentru curs
        course_key = (topic_name, study_year, specialization)

        # Căutăm cursul în BD sau îl creăm dacă nu există
        if course_key in course_dict:
            course = course_dict[course_key]
        else:
            course = Course.query.filter_by(
                name=topic_name,
                study_year=study_year,
                specialization=specialization
            ).first()

            if not course:
                course = Course(
                    name=topic_name,
                    study_year=study_year,
                    specialization=specialization,
                    coordinator_id=None,  # Va fi actualizat ulterior
                )
                db.session.add(course)

            course_dict[course_key] = course  # Stocăm cursul în dicționar

        # Asociem profesorii în funcție de tipul activității
        if type_short_name in ["curs","pr"]:
            course.coordinator_id = professor.user_id  # Profesorul devine coordonator
        elif type_short_name in ["lab", "sem"]:
            if professor not in course.assistants:
                course.assistants.append(professor)  # Profesorul devine asistent

    db.session.commit()



import re

def extract_year_specialization_from_pair(course_groups, course_id):
    """
    Extrage anul, specializarea și facultatea din pereche.
    Suportă ambele formate de date:
      - ["KMS an 2", "FEFS"]
      - ["1117a", "FEFS,KMS an 1"]
    """
    pair = course_groups.get(str(course_id))  # Găsim perechea pentru ID-ul cursului
    if not pair or len(pair) < 2:
        return None, None, None  # Dacă nu avem date, returnăm None

    faculty_info = pair[1]  # Al doilea element conține facultatea și uneori specializarea

    if current_app.config.get("SHORT_FACULTY_NAME") not in faculty_info:
        return None, None, None  # Dacă facultatea nu este corespunzătoare, returnăm None

    faculties = faculty_info.split(",")  # Poate conține mai multe facultăți
    faculty = faculties[0].strip()  # Prima facultate

    # Verificăm unde apare "an X"
    specialization_part = pair[0] if "an" in pair[0] else pair[1]

    # Extragem specializarea și anul
    match = re.search(r"(.+)\s+an\s+(\d+)", specialization_part)
    if match:
        specialization = match.group(1).split(",")[-1].strip()  # Ultima specializare
        year = int(match.group(2))  # Anul ca număr întreg
        return year, specialization, faculty

    return None, None, None



