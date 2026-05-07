import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/auth/login");

export const POST = proxy;
