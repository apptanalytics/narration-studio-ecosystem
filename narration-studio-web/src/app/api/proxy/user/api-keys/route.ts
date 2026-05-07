import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/user/api-keys");

export const GET = proxy;
export const POST = proxy;
