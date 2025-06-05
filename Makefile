# ai_service הרצת בדיקות 
test-ai-service:
	cd ai_service && pip install -r app/requirements.txt && pytest

# הרצת בדיקות יחידה בק
test-backend:
	cd backend && pip install -r app/requirements.txt && pytest unit_tests

# הרצת בדיקות אינטגרציה בק
integration-test:
	cd backend && pip install -r app/requirements.txt && TESTING=1 pytest integration_tests/integration_test.py -v

# הרצת בדיקות פרונט
test-frontend:
	cd frontend && npm install && npm test -- --watchAll=false
	
# הרמת דוקר ובנייתו
up:
	docker compose up --build

# הורדת הדוקר
down:
	docker compose down
