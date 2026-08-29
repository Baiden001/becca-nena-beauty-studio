import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to the request first so this same middleware invocation
          // sees the fresh cookies, THEN build one response and copy every
          // cookie onto it. Building a new response per cookie (the old
          // bug) throws away everything but the last one written.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() re-validates against the Supabase Auth server rather than
  // just trusting whatever's in the cookie — the right call here since
  // this result gates every /admin route.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/((?!login).*)"],
};
