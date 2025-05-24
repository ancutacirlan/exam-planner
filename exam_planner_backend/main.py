from app import create_app
from app.import_data import fetch_and_store_data, add_admin

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        add_admin()
    app.run(debug=True)
