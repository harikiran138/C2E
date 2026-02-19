/**
 * Centralized API configuration for production readiness.
 * Locally defaults to localhost:8001 (Python backend).
 * In production, this should be set to the public URL of the AI backend.
 */
export const AI_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
