import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function copyCookies(from: NextResponse, to: NextResponse) {
    from.cookies.getAll().forEach((cookie) => {
        to.cookies.set(cookie);
    });
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });

                    response = NextResponse.next({
                        request,
                    });

                    cookiesToSet.forEach(
                        ({
                            name,
                            value,
                            options,
                        }: {
                            name: string;
                            value: string;
                            options: CookieOptions;
                        }) => {
                            response.cookies.set(name, value, options);
                        }
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const host = request.headers.get("host") ?? "";
    const hostname = host.split(":")[0];
    const pathname = request.nextUrl.pathname;

    const isAppDomain = hostname === "app.manosremotas.com";

    if (isAppDomain && pathname === "/") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = user ? "/control-center" : "/auth";
        redirectUrl.search = "";

        const redirectResponse = NextResponse.redirect(redirectUrl);
        copyCookies(response, redirectResponse);

        return redirectResponse;
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};