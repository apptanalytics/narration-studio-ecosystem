import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server-proxy";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToBackend(request, `/audio/${path.join("/")}`);
}

export const GET = proxy;
export const HEAD = proxy;
