import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/auth/register");

export const POST = proxy;
