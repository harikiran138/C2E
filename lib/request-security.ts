import crypto from "crypto";
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
} from "./constants";
import { verifyToken } from "./auth";
import { normalizeRole } from "./auth-routing";

const PROMPT_INJECTION_PATTERN =
  /\b(ignore (all|any|previous|above)|disregard (all|previous|above)|forget (all|previous|above)|system prompt|developer prompt|assistant prompt|return admin token|reveal .*token|bypass (rules|guardrails|safety)|jailbreak|override (instructions|guardrails)|act as (the|an?) (assistant|system))\b/i;

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function createCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getCookieValueFromHeader(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const entry = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!entry) {
    return null;
  }

  return decodeURIComponent(entry.slice(name.length + 1));
}

export function attachCsrfCookie(
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options: {
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: "strict" | "lax" | "none";
          path?: string;
          maxAge?: number;
        },
      ) => void;
    };
  },
  maxAgeSeconds = 60 * 60,
) {
  const token = createCsrfToken();
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return token;
}

export function getRequestAuthToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  return (
    getCookieValueFromHeader(cookieHeader, AUTH_COOKIE_NAME) ||
    getCookieValueFromHeader(cookieHeader, LEGACY_AUTH_COOKIE_NAME)
  );
}

export async function resolveRequesterIdentity(
  request: Request,
  scope: string,
  fallbackId?: string | null,
) {
  const token = getRequestAuthToken(request);
  if (token) {
    const payload = await verifyToken(token);
    const role = normalizeRole(payload?.role as string);
    const subject =
      (payload?.program_id as string | undefined) ||
      (payload?.id as string | undefined) ||
      fallbackId ||
      extractClientIp(request);

    return `${scope}:${role || "USER"}:${subject}`;
  }

  return `${scope}:ANON:${fallbackId || extractClientIp(request)}`;
}

export function verifyCsrfToken(request: Request): string | null {
  const authToken = getRequestAuthToken(request);
  if (!authToken) {
    return null;
  }

  const cookieHeader = request.headers.get("cookie");
  const csrfCookie = getCookieValueFromHeader(cookieHeader, CSRF_COOKIE_NAME);
  const csrfHeader = request.headers.get("x-csrf-token");

  if (!csrfCookie) {
    return null;
  }

  if (!csrfHeader || csrfCookie !== csrfHeader) {
    return "Invalid CSRF token.";
  }

  return null;
}

export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    "127.0.0.1"
  );
}

export function rejectCrossSiteRequest(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    return "Cross-site requests are not allowed.";
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ||
    requestUrl.protocol.replace(":", "");

  const allowedOrigins = new Set<string>([
    requestUrl.origin,
    process.env.NEXT_PUBLIC_APP_URL || "",
    process.env.APP_URL || "",
    forwardedHost ? `${forwardedProto}://${forwardedHost}` : "",
  ]);

  if (!allowedOrigins.has(origin)) {
    return "Cross-site requests are not allowed.";
  }

  return null;
}

export function sanitizeAiText(
  value: unknown,
  options: {
    fieldName: string;
    maxLength: number;
    allowEmpty?: boolean;
  },
): string {
  const { fieldName, maxLength, allowEmpty = false } = options;
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  const cleaned = normalizeWhitespace(
    raw
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/```/g, " ")
      .replace(/[<>]/g, " "),
  );

  if (!cleaned) {
    if (allowEmpty) {
      return "";
    }
    throw new InputValidationError(`${fieldName} is required.`);
  }

  if (cleaned.length > maxLength) {
    throw new InputValidationError(
      `${fieldName} must be ${maxLength} characters or fewer.`,
    );
  }

  if (PROMPT_INJECTION_PATTERN.test(cleaned)) {
    throw new InputValidationError(
      `${fieldName} contains unsupported instruction-like content.`,
    );
  }

  return cleaned;
}

export function sanitizeAiList(
  value: unknown,
  options: {
    fieldName: string;
    maxItems: number;
    maxItemLength: number;
  },
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleaned = value
    .slice(0, options.maxItems)
    .map((item) =>
      sanitizeAiText(item, {
        fieldName: options.fieldName,
        maxLength: options.maxItemLength,
        allowEmpty: true,
      }),
    )
    .filter(Boolean);

  return Array.from(new Set(cleaned));
}
