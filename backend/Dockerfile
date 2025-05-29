# הוראות לבניית קונטיינר דוקר עבור אפליקציית פייתון

FROM python:3.10

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

COPY ./app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]