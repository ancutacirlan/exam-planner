import os
from datetime import datetime

import pandas as pd
from flasgger import swag_from
from flask import Blueprint, current_app
from openpyxl import Workbook
from io import BytesIO
from datetime import datetime
from flask import send_file, jsonify
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors, fonts
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
import os

from app import db
from app.decorators import roles_required
from app.models import Exam

download_bp = Blueprint("download", __name__)


@download_bp.route("/download/user-template", methods=["GET"])
@roles_required("SEC")
@swag_from({
    'tags': ['Download'],
    'summary': 'Descarcă modelul de fișier Excel pentru utilizatori',
    'description': 'Returnează un fișier Excel ce servește ca model pentru încărcarea utilizatorilor în sistem.',
    'responses': {
        200: {
            'description': 'Fișier Excel generat cu succes',
            'content': {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                    'schema': {
                        'type': 'string',
                        'format': 'binary'
                    }
                }
            }
        },
        401: {
            'description': 'Utilizator neautentificat sau fără drepturi',
        },
        500: {
            'description': 'Eroare internă la generarea fișierului'
        }
    }
})
def download_user_template():
    file_path = os.path.join(current_app.root_path, 'static', 'templates', 'excel', 'utilizatori_SG.xlsx')
    print(file_path)

    try:
        return send_file(
            file_path,
            as_attachment=True,
            download_name="model_utilizatori_SG.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except FileNotFoundError:
        return {"message": "Fișierul model nu a fost găsit."}, 404


@download_bp.route("/download/exams-xlsx", methods=["GET"])
@swag_from({
    'tags': ['Download'],
    'summary': 'Descarcă fișier Excel cu examenele și datele acestora',
    'description': 'Returnează un fișier Excel care conține informațiile despre examene, cursuri, grupuri și profesori.',
    'responses': {
        200: {
            'description': 'Fișier Excel cu examenele generat cu succes',
            'content': {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                    'schema': {
                        'type': 'string',
                        'format': 'binary'
                    }
                }
            }
        },
        500: {
            'description': 'Eroare internă la generarea fișierului Excel'
        }
    }
})
def download_exams():
    # Creăm un workbook și o foaie de lucru
    wb = Workbook()
    ws = wb.active
    ws.title = "Examene"


    ws.append([
        "Grupa", "Disciplina", "Examinator", "Asistent", "Data examen/colocviu", "Ora examen/colocviu",
        "Sala"
    ])

    # Obținem toate examenele din baza de date, sortate după data și ora examenului
    exams = db.session.query(Exam).order_by(Exam.exam_date.asc(), Exam.start_time.asc()).all()

    for exam in exams:
        # Adunăm datele despre fiecare examen
        course = exam.course
        group = exam.group
        room = exam.room
        professor = exam.professor
        assistant = exam.assistant


        # Adăugăm informațiile într-o linie în fișierul Excel
        ws.append([
            group.name + "/" + str(group.year_of_study) + "/" + group.specialization,
            course.name,
            professor.name,
            assistant.name if assistant else "N/A",
            exam.exam_date.strftime("%Y-%m-%d"),  # Formatează data
            exam.start_time.strftime("%H:%M") if exam.start_time else "N/A",  # Formatează ora
            room.name if room else "N/A",  # Verifică dacă există sală
        ])

    # Salvează fișierul într-un obiect BytesIO
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)

    # Trimitem fișierul pentru descărcare
    return send_file(
        excel_file,
        as_attachment=True,
        download_name=f"examene_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@download_bp.route("/download/exams-pdf", methods=["GET"])
# @roles_required("SEC")
@swag_from({
    'tags': ['Download'],
    'summary': 'Descarcă fișier PDF cu examenele și datele acestora',
    'description': 'Returnează un fișier PDF care conține informațiile despre examene, cursuri, grupuri și profesori.',
    'responses': {
        200: {
            'description': 'Fișier PDF cu examenele generat cu succes',
            'content': {
                'application/pdf': {
                    'schema': {
                        'type': 'string',
                        'format': 'binary'
                    }
                }
            }
        },
        500: {
            'description': 'Eroare internă la generarea fișierului PDF'
        }
    }
})
def download_exams_pdf():
    font_path = os.path.join(current_app.root_path, 'static', 'DejaVuSans.ttf')

    # Înregistrează fontul
    pdfmetrics.registerFont(TTFont('DejaVuSans', font_path))

    exams = db.session.query(Exam).order_by(Exam.exam_date.asc(), Exam.start_time.asc()).all()

    data = [
        ["Grupa", "Disciplina", "Examinator", "Asistent", "Data examen/colocviu", "Ora examen/colocviu",
         "Sala"]
    ]

    # Adăugăm datele examenele
    for exam in exams:
        course = exam.course
        group = exam.group
        room = exam.room
        professor = exam.professor
        assistant = exam.assistant

        data.append([
            group.name + "/" + str(group.year_of_study) + "/" + group.specialization,
            course.name,
            professor.name,
            assistant.name if assistant else "N/A",
            exam.exam_date.strftime("%Y-%m-%d"),  # Formatează data
            exam.start_time.strftime("%H:%M") if exam.start_time else "N/A",  # Formatează ora
            room.name if room else "N/A",  # Verifică dacă există sală
        ])

    # Crează documentul PDF
    pdf_file = os.path.join(current_app.root_path, 'static', "examene.pdf")
    doc = SimpleDocTemplate(pdf_file, pagesize=landscape(letter))  # Format landscape

    title = "Programarea colocviilor si examenelor"
    styles = getSampleStyleSheet()
    title_style = styles['Title']
    title_paragraph = Paragraph(title, title_style)
    # Creează tabelul
    table = Table(data)

    # Adaugă stil pentru tabel
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'DejaVuSans'),  # Folosește fontul înregistrat
        ('FONTSIZE', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ])

    table.setStyle(style)

    # Adaugă tabelul la document
    elements = [title_paragraph, table]
    doc.build(elements)

    print(f"Fișierul PDF a fost generat: {pdf_file}")

    # Trimite fișierul PDF către utilizator
    return send_file(
        pdf_file,
        as_attachment=True,
        download_name=f"examene_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.pdf",
        mimetype="application/pdf"
    )
