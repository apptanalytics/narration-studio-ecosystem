import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server-proxy";

type RouteContext = { params: Promise<{ id: string }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, `/api/admin/api-keys/${id}`);
}

export const PATCH = proxy;
export const DELETE = proxy;
