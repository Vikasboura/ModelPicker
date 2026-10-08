from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine_kwargs = {"connect_args": connect_args, "echo": False, "future": True}

if settings.database_url.startswith("sqlite:///:memory:"):
    engine_kwargs["poolclass"] = StaticPool

engine = create_engine(settings.database_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Import all models to register them on Base.metadata
    import app.models.benchmark  # noqa: F401
    import app.models.dataset  # noqa: F401
    import app.models.evaluation  # noqa: F401
    import app.models.model  # noqa: F401

    Base.metadata.create_all(bind=engine)
