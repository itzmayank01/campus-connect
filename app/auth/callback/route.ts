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
        // Check if user exists in DB
        let dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id },
          select: { role: true },
        });

        if (!dbUser) {
          // User doesn't exist in DB yet — check Supabase metadata for role
          const metaRole = user.user_metadata?.role; // "student" or "faculty"
          const metaFacultyId = user.user_metadata?.faculty_id;
          const metaName = user.user_metadata?.name || user.user_metadata?.full_name || null;

          if (metaRole) {
            // Email signup — role was already selected, auto-create user
            dbUser = await prisma.user.create({
              data: {
                supabaseId: user.id,
                email: user.email || "",
                name: metaName,
                image: user.user_metadata?.avatar_url || null,
                role: metaRole === "faculty" ? "FACULTY" : "STUDENT",
                facultyId: metaRole === "faculty" ? metaFacultyId : null,
              },
              select: { role: true },
            });
          } else {
            // Google OAuth — no role in metadata, go to role-select
            redirectPath = "/auth/role-select";
          }
        }

        // Always redirect to student dashboard
        // Faculty dashboard temporarily disabled
        if (dbUser) {
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
