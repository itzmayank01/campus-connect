import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Skip middleware entirely for API routes — they handle their own auth
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // If Supabase env vars are missing, skip auth middleware entirely
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  try {
    // Race the Supabase session update against a 3s timeout
    // to prevent MIDDLEWARE_INVOCATION_TIMEOUT on Vercel
    const timeoutPromise = new Promise<NextResponse>((resolve) =>
      setTimeout(() => resolve(NextResponse.next()), 3000)
    );
    return await Promise.race([updateSession(request), timeoutPromise]);
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Only run middleware on dashboard and auth pages.
     * Exclude: static files, images, favicon, public assets, and API routes.
     */
    "/(dashboard|login|signup)(.*)",
  ],
};
