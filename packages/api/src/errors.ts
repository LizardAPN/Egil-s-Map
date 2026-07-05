import type { AuthError, PostgrestError } from "@supabase/supabase-js";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type SupabaseError = AuthError | PostgrestError | { code?: string; message: string };

export function toApiError(error: SupabaseError): ApiError {
  const code = "code" in error && error.code ? error.code : "unknown";
  const message =
    "message" in error && error.message ? error.message : "Unknown error";
  return new ApiError(code, message);
}
