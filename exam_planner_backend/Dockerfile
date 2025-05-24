FROM python:3.11

WORKDIR /app

# Copiem codul aplicației și fișierele necesare
COPY app/ ./app
COPY docs/ ./docs
COPY reports/ ./reports
COPY tests/ ./tests
COPY tmp/ ./tmp
COPY uploads/ ./uploads
COPY migrations/ ./migrations
COPY main.py .
COPY init_admin.py .
COPY requirements.txt .

# Instalăm dependențele
RUN pip install --no-cache-dir -r requirements.txt

# Pornim aplicația cu gunicorn pe portul 8000
CMD ["sh", "-c", "flask db upgrade && python init_admin.py && gunicorn -w 4 -b 0.0.0.0:8000 main:app"]
