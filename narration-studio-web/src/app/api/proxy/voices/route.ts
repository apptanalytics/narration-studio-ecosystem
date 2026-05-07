import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/voices");

export const GET = proxy;
