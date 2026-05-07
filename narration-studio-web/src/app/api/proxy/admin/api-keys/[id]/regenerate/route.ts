import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, `/api/admin/api-keys/${id}/regenerate`);
}
