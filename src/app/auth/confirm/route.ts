import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = (requestUrl.searchParams.get("type") ?? "signup") as EmailOtpType;
  const next = requestUrl.searchParams.get("next") ?? "/perfil";

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/login?auth_error=missing_token", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?auth_error=missing_supabase", requestUrl.origin));
  }

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?auth_error=expired_or_invalid", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
