import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // If Supabase env vars are missing, skip auth middleware entirely
  // This prevents MIDDLEWARE_INVOCATION_FAILED on Vercel
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.warn(
      "⚠️ Supabase env vars missing — auth middleware disabled"
    );
    return NextResponse.next();
  }

  try {
    return await updateSession(request);
  } catch (error) {
    // If middleware fails (e.g., Supabase is unreachable), let the request through
    // rather than crashing with a 500
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     * - public files (images, svgs, etc.)
     * - API routes that don't need auth middleware (subjects, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
