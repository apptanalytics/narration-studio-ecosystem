import { makeProxyRoute } from "@/lib/server-proxy";

const proxy = makeProxyRoute("/api/voices/upload");

export const POST = proxy;
