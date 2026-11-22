from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. The database URL (this will create a file named tuition.db in your folder)
SQLALCHEMY_DATABASE_URL = "sqlite:///./tuition.db"

# 2. Create the "engine" (the core interface to the database)
# connect_args={"check_same_thread": False} is required only for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Create a SessionLocal class (each time we need to talk to the DB, we create a session)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Create a Base class (all our database models will inherit from this)
Base = declarative_base()

# 5. A helper function we will use later to open and close database connections safely
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
