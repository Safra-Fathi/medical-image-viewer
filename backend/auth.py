import hashlib
import hmac
import secrets

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from database import get_db


# ============================================================
# CONFIGURATION
# ============================================================

SESSION_HOURS = 12

bearer_scheme = HTTPBearer(
    auto_error=False
)


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(
    password: str,
    salt: str | None = None
):

    if salt is None:
        salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()

    return password_hash, salt


def verify_password(
    password: str,
    stored_hash: str,
    salt: str
):

    calculated_hash, _ = hash_password(
        password,
        salt
    )

    return hmac.compare_digest(
        calculated_hash,
        stored_hash
    )


# ============================================================
# SESSION TOKENS
# ============================================================

def hash_token(token: str) -> str:

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def create_token(user_id: int) -> str:

    token = secrets.token_urlsafe(32)

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(hours=SESSION_HOURS)
    ).isoformat()

    connection = get_db()

    try:
        connection.execute(
            """
            INSERT INTO sessions (
                user_id,
                token_hash,
                expires_at
            )
            VALUES (?, ?, ?)
            """,
            (
                user_id,
                hash_token(token),
                expires_at,
            )
        )

        connection.commit()

    finally:
        connection.close()

    return token


# ============================================================
# CURRENT AUTHENTICATED USER
# ============================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None
    = Depends(bearer_scheme)
):

    if credentials is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_hash = hash_token(
        credentials.credentials
    )

    connection = get_db()

    try:
        user = connection.execute(
            """
            SELECT
                users.id,
                users.name,
                users.email,
                sessions.expires_at
            FROM sessions
            INNER JOIN users
                ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
              AND sessions.revoked_at IS NULL
            """,
            (token_hash,)
        ).fetchone()

    finally:
        connection.close()

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid or revoked session.",
        )

    expires_at = datetime.fromisoformat(
        user["expires_at"]
    )

    if expires_at <= datetime.now(timezone.utc):

        raise HTTPException(
            status_code=401,
            detail="Session has expired.",
        )

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
    }


# ============================================================
# LOGOUT / REVOKE SESSION
# ============================================================

def revoke_token(token: str):

    connection = get_db()

    try:
        connection.execute(
            """
            UPDATE sessions
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE token_hash = ?
            """,
            (hash_token(token),)
        )

        connection.commit()

    finally:
        connection.close()


# ============================================================
# AUDIT LOGGING
# ============================================================

def create_audit_log(
    action: str,
    user_id: int | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: str | None = None,
):

    connection = get_db()

    try:
        connection.execute(
            """
            INSERT INTO audit_logs (
                user_id,
                action,
                resource_type,
                resource_id,
                details
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                action,
                resource_type,
                resource_id,
                details,
            )
        )

        connection.commit()

    finally:
        connection.close()