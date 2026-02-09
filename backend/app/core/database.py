from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

settings = get_settings()
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=5,  # Number of connections to maintain
    max_overflow=10,  # Additional connections beyond pool_size
    pool_recycle=3600,  # Recycle connections after 1 hour
)
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
