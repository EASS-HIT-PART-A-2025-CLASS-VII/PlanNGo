from app.db.database import create_all_tables

if __name__ == "__main__":
    print("Creating all tables...")
    create_all_tables()
    print("Done.")