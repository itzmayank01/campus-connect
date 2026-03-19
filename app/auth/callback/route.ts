import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      // Get user info to determine redirect
      const { data: { user } } = await supabase.auth.getUser();
      
      let redirectPath = next || "/dashboard";
      
      if (user && !next) {
        // Check if user exists in DB and has a role
        const dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id },
          select: { role: true },
        });

        if (!dbUser) {
          // First-time user — needs role selection
          redirectPath = "/auth/role-select";
        } else if (dbUser.role === "FACULTY") {
          redirectPath = "/faculty/dashboard";
        } else {
          redirectPath = "/dashboard";
        }
      }

      const getRedirectUrl = (base: string) => `${base}${redirectPath}`;

      if (isLocalEnv) {
        return NextResponse.redirect(getRedirectUrl(origin));
      } else if (forwardedHost) {
        return NextResponse.redirect(getRedirectUrl(`https://${forwardedHost}`));
      } else {
        return NextResponse.redirect(getRedirectUrl(origin));
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
