import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function applyCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return applyCors(new NextResponse(null, { status: 204 }));
  }

  return applyCors(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"]
};
