import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/admin/api-logs");

export const GET = proxy;
