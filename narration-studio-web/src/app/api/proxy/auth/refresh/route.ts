import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/auth/refresh");

export const POST = proxy;
