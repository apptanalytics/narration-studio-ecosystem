import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/generate");

export const POST = proxy;
