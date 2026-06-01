export function buildPublicShareUrl(request: Request, token: string) {
  const configured = process.env.PUBLIC_WEB_URL || process.env.WEB_PUBLIC_URL;
  const origin =
    configured ||
    request.headers.get("origin") ||
    request.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
    `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("x-forwarded-host") || request.headers.get("host")}`;

  return `${origin?.replace(/\/$/, "") || ""}/share/${token}`;
}
