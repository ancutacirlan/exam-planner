from unittest.mock import patch
import pytest
from flask_jwt_extended import create_access_token
from datetime import datetime

from app import create_app
from app.models import ExaminationPeriod, db

# Fixture pentru crearea aplicației și a clientului de test
@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # DB în memorie
    app.config['JWT_SECRET_KEY'] = 'test-secret'

    with app.app_context():
        db.create_all()

    return app

@pytest.fixture
def client(app):
    return app.test_client()  # Clientul de test pentru a trimite cereri

# Mock pentru funcțiile care verifică JWT și rolul
def mock_get_jwt():
    return {"role": "ADM"}  # Rol valid pentru testul nostru

def mock_verify_jwt_in_request():
    pass  # Nu facem verificarea reală în acest test

# Test pentru crearea unei perioade de examinare
@patch('flask_jwt_extended.get_jwt', mock_get_jwt)
@patch('flask_jwt_extended.verify_jwt_in_request', mock_verify_jwt_in_request)
def test_create_examination_period(client, app):
    with app.app_context():
        db.session.query(ExaminationPeriod).delete()
        db.session.commit()

    with app.app_context():
        token = create_access_token(identity='testuser', additional_claims={'role': 'ADM'})
        response = client.post(
            '/settings/examination-periods',
            json={
                "name": "EXAMEN",
                "period_start": "2025-06-01",
                "period_end": "2025-06-30"
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 201
        assert response.get_json() == {"message": "Perioadă creată cu succes"}

# Test pentru obținerea tuturor perioadelor de examinare
@patch('flask_jwt_extended.get_jwt', mock_get_jwt)
@patch('flask_jwt_extended.verify_jwt_in_request', mock_verify_jwt_in_request)
def test_get_examination_periods(client, app):
    with app.app_context():
        db.session.query(ExaminationPeriod).delete()
        db.session.commit()

    with app.app_context():
        token = create_access_token(identity='testuser', additional_claims={'role': 'ADM'})
        # Adăugăm o perioadă de examinare pentru test
        period = ExaminationPeriod(
            name="EXAMEN",
            period_start=datetime(2025, 6, 1),
            period_end=datetime(2025, 6, 30)
        )
        db.session.add(period)
        db.session.commit()

        response = client.get('/settings/examination-periods', headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) > 0

# Test pentru obținerea perioadei de examinare după ID
@patch('flask_jwt_extended.get_jwt', mock_get_jwt)
@patch('flask_jwt_extended.verify_jwt_in_request', mock_verify_jwt_in_request)
def test_get_examination_period_by_id(client, app):
    with app.app_context():
        db.session.query(ExaminationPeriod).delete()
        db.session.commit()

    with app.app_context():
        token = create_access_token(identity='testuser', additional_claims={'role': 'ADM'})
        # Creăm o perioadă de examinare pentru test
        period = ExaminationPeriod(
            name="EXAMEN",
            period_start=datetime(2025, 6, 1),
            period_end=datetime(2025, 6, 30)
        )
        db.session.add(period)
        db.session.commit()
        period_id = period.examination_period_id

    with app.app_context():
        response = client.get(f'/settings/examination-periods/{period_id}', headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 200
        data = response.get_json()
        assert data["examination_period_id"] == period_id
        assert data["name"] == "EXAMEN"

# Test pentru actualizarea unei perioade de examinare
@patch('flask_jwt_extended.get_jwt', mock_get_jwt)
@patch('flask_jwt_extended.verify_jwt_in_request', mock_verify_jwt_in_request)
def test_update_examination_period(client, app):
    with app.app_context():
        db.session.query(ExaminationPeriod).delete()
        db.session.commit()

    with app.app_context():
        token = create_access_token(identity='testuser', additional_claims={'role': 'ADM'})
        # Creăm o perioadă de examinare pentru test
        period = ExaminationPeriod(
            name="EXAMEN",
            period_start=datetime(2025, 6, 1),
            period_end=datetime(2025, 6, 30)
        )
        db.session.add(period)
        db.session.commit()
        period_id = period.examination_period_id

    with app.app_context():
        response = client.put(
            f'/settings/examination-periods/{period_id}',
            json={
                "name": "COLOCVIU",
                "period_start": "2025-07-01",
                "period_end": "2025-07-31"
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["message"] == "Perioadă actualizată"

# Test pentru ștergerea unei perioade de examinare
@patch('flask_jwt_extended.get_jwt', mock_get_jwt)
@patch('flask_jwt_extended.verify_jwt_in_request', mock_verify_jwt_in_request)
def test_delete_examination_period(client, app):
    with app.app_context():
        db.session.query(ExaminationPeriod).delete()
        db.session.commit()

    with app.app_context():
        token = create_access_token(identity='testuser', additional_claims={'role': 'ADM'})
        # Creăm o perioadă de examinare pentru test
        period = ExaminationPeriod(
            name="EXAMEN",
            period_start=datetime(2025, 6, 1),
            period_end=datetime(2025, 6, 30)
        )
        db.session.add(period)
        db.session.commit()
        period_id = period.examination_period_id

    with app.app_context():
        response = client.delete(f'/settings/examination-periods/{period_id}', headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 200
        assert response.get_json() == {"message": "Perioadă ștearsă"}

# Test pentru caz în care perioada de examinare nu există
@patch('flask_jwt_extended.get_jwt', mock_get_jwt)
@patch('flask_jwt_extended.verify_jwt_in_request', mock_verify_jwt_in_request)
def test_get_examination_period_not_found(client, app):
    with app.app_context():
        db.session.query(ExaminationPeriod).delete()
        db.session.commit()

    with app.app_context():
        token = create_access_token(identity='testuser', additional_claims={'role': 'ADM'})
        response = client.get('/settings/examination-periods/9999', headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 404
        assert response.get_json() == {"message": "Perioada nu a fost găsită"}
