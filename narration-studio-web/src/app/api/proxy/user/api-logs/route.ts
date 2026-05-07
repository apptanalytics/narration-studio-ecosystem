import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/user/api-logs");

export const GET = proxy;
