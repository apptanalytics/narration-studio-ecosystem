import { baseApi, unwrapResponse } from "@/store/api/baseApi";
import type { AuthUser, UserSession, VerificationStatusResponse, VoiceClone } from "@/lib/types";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateMe: builder.mutation<unknown, Partial<AuthUser>>({
      query: (body) => ({ url: "/auth/me", method: "PATCH", body }),
      invalidatesTags: ["Auth", "User"],
    }),
    updatePassword: builder.mutation<unknown, { current_password: string; new_password: string }>({
      query: (body) => ({ url: "/auth/password", method: "PATCH", body }),
    }),
    verificationStatus: builder.query<VerificationStatusResponse, void>({
      query: () => "/verification/status",
      transformResponse: unwrapResponse<VerificationStatusResponse>,
      providesTags: ["User"],
    }),
    userVoiceClones: builder.query<{ voice_clones: VoiceClone[] }, void>({
      query: () => "/voice-clones",
      transformResponse: unwrapResponse<{ voice_clones: VoiceClone[] }>,
      providesTags: ["User"],
    }),
    sessions: builder.query<{ sessions: UserSession[] }, void>({
      query: () => "/auth/sessions",
      transformResponse: unwrapResponse<{ sessions: UserSession[] }>,
      providesTags: ["Sessions"],
    }),
  }),
});

export const {
  useUpdateMeMutation,
  useUpdatePasswordMutation,
  useVerificationStatusQuery,
  useUserVoiceClonesQuery,
  useSessionsQuery,
} = userApi;
