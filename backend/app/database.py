"""SQLAlchemy engine, session factory, and declarative base."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

# SQLite needs this flag when used with FastAPI's threaded request handling;
# MySQL does not use or need it.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(
    settings.database_url, pool_pre_ping=True, pool_recycle=280, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base declarative class for SQLAlchemy ORM models."""
    pass


def get_db():
    """Provide a database session for FastAPI dependencies and close it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

