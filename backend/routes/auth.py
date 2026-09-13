import sqlite3

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
)

from database import get_db

from auth import (
    bearer_scheme,
    create_token,
    create_audit_log,
    get_current_user,
    hash_password,
    revoke_token,
    verify_password,
)

from schemas import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
)

from models import (
    AUDIT_REGISTER,
    AUDIT_LOGIN,
    AUDIT_LOGOUT,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=AuthResponse,
)
def register(request: RegisterRequest):

    name = request.name.strip()
    email = request.email.strip().lower()
    password = request.password

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name is required.",
        )

    if not email or "@" not in email:

        raise HTTPException(
            status_code=400,
            detail="A valid email is required.",
        )

    if len(password) < 12:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be at least "
                "12 characters long."
            ),
        )

    password_hash, salt = hash_password(
        password
    )

    connection = get_db()

    try:

        cursor = connection.execute(
            """
            INSERT INTO users (
                name,
                email,
                password_hash,
                salt
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                name,
                email,
                password_hash,
                salt,
            ),
        )

        connection.commit()

        user_id = cursor.lastrowid

    except sqlite3.IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "An account with this email "
                "already exists."
            ),
        )

    finally:

        connection.close()

    token = create_token(user_id)

    create_audit_log(
        action=AUDIT_REGISTER,
        user_id=user_id,
    )

    return {
        "success": True,
        "message": "Account created successfully.",
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
        },
        "token": token,
    }


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=AuthResponse,
)
def login(request: LoginRequest):

    email = request.email.strip().lower()
    password = request.password

    connection = get_db()

    try:

        user = connection.execute(
            """
            SELECT
                id,
                name,
                email,
                password_hash,
                salt
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

    finally:

        connection.close()

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    valid_password = verify_password(
        password,
        user["password_hash"],
        user["salt"],
    )

    if not valid_password:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    token = create_token(
        user["id"]
    )

    create_audit_log(
        action=AUDIT_LOGIN,
        user_id=user["id"],
    )

    return {
        "success": True,
        "message": "Login successful.",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
        "token": token,
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    user=Depends(get_current_user),
):

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
    }


# ============================================================
# LOGOUT
# ============================================================

@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials
    = Depends(bearer_scheme),

    user=Depends(get_current_user),
):

    revoke_token(
        credentials.credentials
    )

    create_audit_log(
        action=AUDIT_LOGOUT,
        user_id=user["id"],
    )

    return {
        "success": True,
        "message": "Logged out successfully.",
    }