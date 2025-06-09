# ai_service הרצת בדיקות 
test-ai-service:
	cd ai_service && pip install -r app/requirements.txt && pytest

# הרצת בדיקות יחידה בק
test-backend:
	cd backend && pip install -r app/requirements.txt && pytest unit_tests

# הרצת בדיקות אינטגרציה בק
integration-test:
	@echo "🔍 Checking if ai_service is running on port 8001..."
	@if ! nc -z localhost 8001; then \
		echo "🚀 ai_service not running – starting it via Docker..."; \
		docker compose up -d ai-service; \
		echo "⏳ Waiting for ai_service to become ready..."; \
		until nc -z localhost 8001; do sleep 1; done; \
		echo "✅ ai_service is up."; \
	else \
		echo "✅ ai_service already running."; \
	fi
	cd backend && \
	pip install -r app/requirements.txt && \
	TESTING=1 pytest integration_tests/integration_test.py -v

# הרצת בדיקות פרונט
test-frontend:
	cd frontend && npm install && npm test -- --watchAll=false
	
# הרמת דוקר ובנייתו
up:
	docker compose up --build

# הורדת הדוקר
down:
	docker compose down
