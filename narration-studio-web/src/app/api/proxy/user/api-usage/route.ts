import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/user/api-usage");

export const GET = proxy;
