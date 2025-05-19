# PostgreSQL יוצר חיבור למסד הנתונים 

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# DB ל session פונקציה שמחזירה 
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# DB להתחבר ל FastAPI כתובת שמאפשרת ל
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# DB יצירת החיבור ל 
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# route בכל DB דרכו נוכל לדבר עם ה session יצירת 
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ממנו יירשו כל המודלים base class
Base = declarative_base()
