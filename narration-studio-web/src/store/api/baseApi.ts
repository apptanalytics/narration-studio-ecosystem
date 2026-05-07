import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { clearCredentials, setAuthError, type AppError } from "@/store/authSlice";

type BackendEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export const apiRoot = "/api/proxy";
export const apiBaseUrl = apiRoot;

export function normalizeApiError(error: FetchBaseQueryError | unknown): AppError {
  if (typeof error === "object" && error && "status" in error) {
    const status = typeof (error as FetchBaseQueryError).status === "number" ? (error as FetchBaseQueryError).status as number : undefined;
    const data = (error as FetchBaseQueryError).data as BackendEnvelope | { detail?: string } | undefined;
    if (data && typeof data === "object") {
      if ("error" in data && data.error) {
        return {
          code: data.error.code || "REQUEST_ERROR",
          message: data.error.message || "Request failed.",
          details: data.error.details,
          status,
        };
      }
      if ("detail" in data && data.detail) {
        return { code: "REQUEST_ERROR", message: String(data.detail), status };
      }
    }
    return { code: "REQUEST_ERROR", message: "Request failed.", status };
  }
  return { code: "REQUEST_ERROR", message: "Request failed." };
}

const baseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
  prepareHeaders(headers) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return headers;
  },
});

let refreshPromise: Promise<unknown> | null = null;

const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const path = typeof args === "string" ? args : args.url;
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && path !== "/auth/refresh" && !path.includes("/auth/login")) {
    refreshPromise ??= Promise.resolve(baseQuery({ url: "/auth/refresh", method: "POST", body: {} }, api, extraOptions)).finally(() => {
      refreshPromise = null;
    });
    const refreshResult = await refreshPromise as { error?: FetchBaseQueryError };
    if (!refreshResult.error) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
    }
  }

  if (result.error) {
    api.dispatch(setAuthError(normalizeApiError(result.error)));
  }
  return result;
};

export function unwrapResponse<T>(response: BackendEnvelope<T> | T): T {
  if (response && typeof response === "object" && "success" in response && "data" in response) {
    return (response as BackendEnvelope<T>).data as T;
  }
  return response as T;
}

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: ["Auth", "User", "Admin", "Plans", "Notifications", "Sessions"],
  endpoints: () => ({}),
});
