# Setează numele și directorul pentru fișierele de raport
REPORT_DIR=reports
PYLINT_REPORT=$(REPORT_DIR)/pylint-report.json
COVERAGE_REPORT=$(REPORT_DIR)/coverage.xml

# Crează fișierele de raport dacă nu există
$(REPORT_DIR):
    mkdir -p $(REPORT_DIR)

# Comanda pentru a rula Pylint și a salva raportul în format JSON
lint: $(REPORT_DIR)
    pylint app tests --output-format=json > $(PYLINT_REPORT)

# Comanda pentru a rula testele și a genera raportul de acoperire în format XML
test: $(REPORT_DIR)
    pytest --cov=app --cov-report=xml --maxfail=1

# Comanda pentru a analiza cu SonarQube folosind raportul Pylint și acoperirea generată de pytest
sonar: lint test
    sonar-scanner

# Comanda default care rulează SonarQube, Pylint și testele
all: sonar
