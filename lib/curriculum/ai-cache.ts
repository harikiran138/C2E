import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

const SESSION_CACHE = new Map<string, any>();
const CACHE_TTL_HOURS = 24;

/**
 * Generates a SHA-256 hash for the given key string.
 */
function generateHash(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Retrieves a cached AI response.
 * Checks in-memory session cache first, then Supabase.
 */
export async function getAiCache(key: string): Promise<any | null> {
  const hash = generateHash(key);

  // 1. Check Session Cache
  if (SESSION_CACHE.has(hash)) {
    console.log(`[AI Cache] Session Hit: ${hash}`);
    return SESSION_CACHE.get(hash);
  }

  // 2. Check Supabase Cache
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_cache")
      .select("response, expires_at")
      .eq("key_hash", hash)
      .single();

    if (error || !data) {
      return null;
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      console.log(`[AI Cache] Expired: ${hash}`);
      return null;
    }

    console.log(`[AI Cache] DB Hit: ${hash}`);
    SESSION_CACHE.set(hash, data.response);
    return data.response;
  } catch (err) {
    console.error("[AI Cache] Error fetching from DB:", err);
    return null;
  }
}

/**
 * Stores an AI response in both session and Supabase cache.
 */
export async function setAiCache(key: string, response: any): Promise<void> {
  const hash = generateHash(key);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  // 1. Update Session Cache
  SESSION_CACHE.set(hash, response);

  // 2. Update Supabase Cache
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_cache").upsert(
      {
        key_hash: hash,
        response,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "key_hash" }
    );

    if (error) {
      console.error("[AI Cache] Error saving to DB:", error);
    } else {
      console.log(`[AI Cache] Saved: ${hash}`);
    }
  } catch (err) {
    console.error("[AI Cache] Unexpected error saving to DB:", err);
  }
}
