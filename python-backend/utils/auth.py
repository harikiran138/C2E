import os
import jwt
from fastapi import Header, HTTPException, Depends
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "dev-fallback-jwt-secret-stable-k3y")
ALGORITHM = "HS256"

class AuthenticatedUser:
    def __init__(self, payload: dict):
        self.id = payload.get("id")
        self.email = payload.get("email")
        self.role = payload.get("role")
        self.institution_id = payload.get("institution_id")
        self.program_id = payload.get("program_id")

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    
    try:
        # Expected format: Bearer <token>
        token = authorization.split(" ")[1] if " " in authorization else authorization
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        
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
