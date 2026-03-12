"""
api/routes/auth.py
Rotas de registro e login de usuários.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from datetime import timedelta

from api.core.database import get_db
from api.models.user import User
from api.schemas.user import UserCreate, UserResponse, Token
from api.core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from api.services.tokens import get_user_monthly_usage, PLAN_LIMITS

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if exists
    result = await db.execute(select(User).where(User.username == user.username))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pass = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_pass, has_access=True)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.has_access:
        raise HTTPException(status_code=403, detail="User does not have access permission")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "id": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    from jose import JWTError, jwt
    from api.core.security import SECRET_KEY, ALGORITHM

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    if not user.has_access:
        raise HTTPException(status_code=403, detail="Access revoked")
    return user

async def require_superuser(current_user: User = Depends(get_current_user)):
    """Dependency que exige is_superuser=True. Lança 403 caso contrário."""
    if not getattr(current_user, "is_superuser", False):
        raise HTTPException(status_code=403, detail="Acesso restrito a superusuários.")
    return current_user

@router.get("/me")
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Retorna dados do usuário e consumo do plano"""
    plan_name = getattr(current_user, "plan", "gratuito")
    limit = PLAN_LIMITS.get(plan_name.lower(), PLAN_LIMITS["gratuito"])
    usage = await get_user_monthly_usage(db, current_user.id)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "plan": plan_name,
        "limit": limit,
        "usage": usage,
        "is_superuser": bool(getattr(current_user, "is_superuser", False))
    }
