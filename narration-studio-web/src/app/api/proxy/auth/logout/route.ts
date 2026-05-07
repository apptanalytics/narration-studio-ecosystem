import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/auth/logout");

export const POST = proxy;
