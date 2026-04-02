import os
import jwt
from fastapi import Header, HTTPException, Request
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.")
    return secret

class AuthenticatedUser:
    def __init__(self, payload: dict):
        self.id = payload.get("id")
        self.email = payload.get("email")
        self.role = payload.get("role")
        self.institution_id = payload.get("institution_id")
        self.program_id = payload.get("program_id")

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    allow_local_bypass = os.getenv("ALLOW_LOCAL_AUTH_BYPASS", "").lower() == "true"
    if allow_local_bypass and request.client and request.client.host in {"127.0.0.1", "::1"}:
        if not authorization:
            return AuthenticatedUser({
                "id": "dev-user-id",
                "email": "dev@antigravity.ai",
                "role": "SUPER_ADMIN"
            })

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    
    try:
        # Expected format: Bearer <token>
        token = authorization.split(" ")[1] if " " in authorization else authorization
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[ALGORITHM])
        
        if not payload.get("id"):
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        return AuthenticatedUser(payload)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_program_context(user: AuthenticatedUser, requested_program_id: str):
    """
    Enforces the 'Zero-Trust' Program isolation boundary.
    Rejects if the user is a PROGRAM_ADMIN but trying to access another program.
    """
    if user.role == "SUPER_ADMIN":
        return True
    
    if user.role == "INSTITUTE_ADMIN":
        # Verification of institution_id matching could be added here
        return True

    if user.role == "PROGRAM_ADMIN":
        if str(user.program_id) != str(requested_program_id):
            raise HTTPException(
                status_code=403, 
                detail="FORBIDDEN: Context isolation violation. User cannot access another program's data."
            )
    return True
