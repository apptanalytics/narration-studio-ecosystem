import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_API_URL || "http://127.0.0.1:8080").replace(/\/$/, "");

export async function proxyToBackend(request: NextRequest, targetPath: string) {
  const apiPath = targetPath.startsWith("/api/") || targetPath.startsWith("/audio/") ? targetPath : `/api${targetPath}`;
  const target = `${BACKEND_URL}${apiPath}${request.nextUrl.search}`;
  const requestId = crypto.randomUUID();
  const isLogin = apiPath === "/api/auth/login";
  const requestBody = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  let loginEmail = "";
  if (isLogin && requestBody) {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(requestBody)) as { email?: unknown };
      loginEmail = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    } catch {
      loginEmail = "";
    }
  }
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("access-control-request-method");
  headers.delete("access-control-request-headers");
  headers.delete("sec-fetch-dest");
  headers.delete("sec-fetch-mode");
  headers.delete("sec-fetch-site");

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("X-NStudio-Proxy-Request", requestId);
    if (isLogin) {
      const text = await response.text();
      let code = "";
      try {
        const parsed = JSON.parse(text) as { error?: { code?: string; message?: string } };
        code = parsed.error?.code ? ` ${parsed.error.code}` : "";
      } catch {
        code = "";
      }
      console.log(`[nstudio-proxy] ${requestId} ${request.method} ${apiPath} ${loginEmail || "unknown-email"} -> ${response.status}${code} ${target}`);
      return new NextResponse(text, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[nstudio-proxy] ${requestId} ${request.method} ${apiPath} failed`, error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Backend proxy failed." },
      { status: 502, headers: { "X-NStudio-Proxy-Request": requestId } },
    );
  }
}

export function makeProxyRoute(targetPath: string) {
  return (request: NextRequest) => proxyToBackend(request, targetPath);
}
