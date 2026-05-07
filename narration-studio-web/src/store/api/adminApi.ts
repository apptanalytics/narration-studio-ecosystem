import { baseApi, unwrapResponse } from "@/store/api/baseApi";
import type { ActivityLog, ApiKey, AuthUser, IdentityVerification, PurchaseRecord, UserSession, VoiceClone } from "@/lib/types";

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    adminUsers: builder.query<{ users: AuthUser[] }, void>({
      query: () => "/admin/users",
      transformResponse: unwrapResponse<{ users: AuthUser[] }>,
      providesTags: ["Admin"],
    }),
    adminUser: builder.query<{ user: AuthUser }, string>({
      query: (id) => `/admin/users/${id}`,
      transformResponse: unwrapResponse<{ user: AuthUser }>,
      providesTags: ["Admin"],
    }),
    patchAdminUser: builder.mutation<unknown, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/admin/users/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Admin"],
    }),
    deleteAdminUser: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/users/${id}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),
    adminUserVerification: builder.query<{ verification: IdentityVerification | null }, string>({
      query: (id) => `/admin/users/${id}/identity-verification`,
      transformResponse: unwrapResponse<{ verification: IdentityVerification | null }>,
      providesTags: ["Admin"],
    }),
    patchAdminUserVerification: builder.mutation<{ verification: IdentityVerification }, { id: string; body: Partial<IdentityVerification> }>({
      query: ({ id, body }) => ({ url: `/admin/users/${id}/identity-verification`, method: "PATCH", body }),
      transformResponse: unwrapResponse<{ verification: IdentityVerification }>,
      invalidatesTags: ["Admin"],
    }),
    adminUserSessions: builder.query<{ sessions: UserSession[] }, string>({
      query: (id) => `/admin/users/${id}/sessions`,
      transformResponse: unwrapResponse<{ sessions: UserSession[] }>,
    }),
    adminUserApiKeys: builder.query<{ api_keys: ApiKey[] }, string>({
      query: (id) => `/admin/users/${id}/api-keys`,
      transformResponse: unwrapResponse<{ api_keys: ApiKey[] }>,
    }),
    adminUserVoiceClones: builder.query<{ voice_clones: VoiceClone[] }, string>({
      query: (id) => `/admin/users/${id}/voice-clones`,
      transformResponse: unwrapResponse<{ voice_clones: VoiceClone[] }>,
    }),
    adminUserPurchases: builder.query<{ purchases: PurchaseRecord[] }, string>({
      query: (id) => `/admin/users/${id}/purchases`,
      transformResponse: unwrapResponse<{ purchases: PurchaseRecord[] }>,
    }),
    adminUserActivityLogs: builder.query<{ logs: ActivityLog[] }, string>({
      query: (id) => `/admin/users/${id}/activity-logs`,
      transformResponse: unwrapResponse<{ logs: ActivityLog[] }>,
    }),
  }),
});

export const {
  useAdminUsersQuery,
  useAdminUserQuery,
  usePatchAdminUserMutation,
  useDeleteAdminUserMutation,
  useAdminUserVerificationQuery,
  usePatchAdminUserVerificationMutation,
  useAdminUserSessionsQuery,
  useAdminUserApiKeysQuery,
  useAdminUserVoiceClonesQuery,
  useAdminUserPurchasesQuery,
  useAdminUserActivityLogsQuery,
} = adminApi;
