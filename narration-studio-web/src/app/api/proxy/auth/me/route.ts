import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/auth/me");

export const GET = proxy;
