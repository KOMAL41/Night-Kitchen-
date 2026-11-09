"""Password hashing, JWT creation/validation, and auth dependencies."""
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plain-text password using the configured password context."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash."""
    return pwd_context.verify(plain, hashed)


def create_token(data: dict, expires_delta: timedelta) -> str:
    """Encode a JWT payload with an expiration timestamp and return the token string."""
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int) -> str:
    """Create a short-lived access token for an authenticated user."""
    return create_token(
        {"sub": str(user_id), "type": "access"},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: int) -> str:
    """Create a refresh token for session renewal with a longer expiration."""
    return create_token(
        {"sub": str(user_id), "type": "refresh"},
        timedelta(days=settings.refresh_token_expire_days),
    )


def get_user_from_refresh_token(token: str, db: Session) -> models.User:
    """Validate a refresh token and return its active user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None or payload.get("type") != "refresh":
            raise credentials_exception
        user_id = int(user_id)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_user(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    """Decode the bearer token, validate the user, and return the current active user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None or payload.get("type") != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_roles(*roles: str):
    """Return a dependency that enforces the requesting user has one of the allowed roles."""
    def checker(user: models.User = Depends(get_current_user)) -> models.User:
        """Application helper function."""
        if roles and user.role.value not in roles:
            raise HTTPException(status_code=403, detail="Not permitted for this role")
        return user

    return checker


def check_kitchen_access(user: models.User) -> int:
    """Verify user has a kitchen assigned. Returns kitchen_id."""
    if not user.kitchen_id:
        raise HTTPException(status_code=403, detail="No kitchen assigned")
    return user.kitchen_id


def is_platform_admin(user: models.User = Depends(get_current_user)) -> models.User:
    """Allow access only to platform administrator users."""
    if user.role.value != "platform_admin":
        raise HTTPException(status_code=403, detail="Only platform admins can access this resource")
    return user


def is_hotel_manager(user: models.User = Depends(get_current_user)) -> models.User:
    """Allow access only to hotel manager users."""
    if user.role.value != "hotel_manager":
        raise HTTPException(status_code=403, detail="Only hotel managers can access this resource")
    return user


def is_customer(user: models.User = Depends(get_current_user)) -> models.User:
    """Allow access only to customer users."""
    if user.role.value != "customer":
        raise HTTPException(status_code=403, detail="Only customers can access this resource")
    return user
