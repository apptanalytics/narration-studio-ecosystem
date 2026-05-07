import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/visitor");

export const GET = proxy;
