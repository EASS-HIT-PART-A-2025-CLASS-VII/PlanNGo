# קובץ הפעלה ראשי של האתר
# FastAPI קובץ זה אחראי על הפעלת השרת ומגדיר את 

from fastapi import FastAPI
from app import routes

app = FastAPI()

app.include_router(routes.router)

