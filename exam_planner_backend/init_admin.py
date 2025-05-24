from app import create_app
from app.import_data import add_admin

app = create_app()

# Rulăm aplicația în contextul Flask pentru a adăuga adminul
with app.app_context():
    add_admin()
    print("Admin a fost adăugat în baza de date.")
