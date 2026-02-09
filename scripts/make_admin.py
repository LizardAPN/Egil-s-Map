#!/usr/bin/env python3
"""
Script to promote a user to ADMIN role.
Usage: python scripts/make_admin.py <username>
"""

import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

# Import models
sys.path.insert(0, 'backend')
from app.models.user import User, UserRole
from app.core.config import get_settings

settings = get_settings()

async def make_admin(username: str):
    """Promote a user to ADMIN role."""
    # Create database engine
    engine = create_async_engine(
        settings.database_url,
        echo=False,
    )
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Find user
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User '{username}' not found!")
            print("\nAvailable users:")
            all_users = await session.execute(select(User))
            for u in all_users.scalars().all():
                print(f"  - {u.username} (role: {u.role.value})")
            return False
        
        if user.role == UserRole.ADMIN:
            print(f"✅ User '{username}' is already an ADMIN")
            return True
        
        # Update role
        await session.execute(
            update(User)
            .where(User.id == user.id)
            .values(role=UserRole.ADMIN)
        )
        await session.commit()
        
        print(f"✅ Successfully promoted '{username}' to ADMIN role!")
        return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/make_admin.py <username>")
        sys.exit(1)
    
    username = sys.argv[1]
    asyncio.run(make_admin(username))
