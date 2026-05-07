import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/jobs");

export const GET = proxy;
export const POST = proxy;
