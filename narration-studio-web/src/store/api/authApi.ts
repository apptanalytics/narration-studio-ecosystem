import { baseApi, apiRoot, unwrapResponse } from "@/store/api/baseApi";
import { clearCredentials, setCredentials } from "@/store/authSlice";
import type { AuthUser, UserSession } from "@/lib/types";

type LoginRequest = {
  email: string;
  password: string;
  totp_code?: string;
};

type RegisterRequest = {
  email: string;
  password: string;
  full_name: string;
  newsletter?: boolean;
};

export const googleLoginUrl = () => "/api/backend/auth/google/login";
export const googleLoginUrlRequested = () => `${apiRoot}/auth/google/login`;

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<{ user: AuthUser }, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: unwrapResponse<{ user: AuthUser }>,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (data.user) dispatch(setCredentials(data.user));
      },
      invalidatesTags: ["Auth"],
    }),
    register: builder.mutation<{ user: AuthUser }, RegisterRequest>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      transformResponse: unwrapResponse<{ user: AuthUser }>,
    }),
    logout: builder.mutation<unknown, void>({
      query: () => ({ url: "/auth/logout", method: "POST", body: {} }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearCredentials());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    logoutAll: builder.mutation<unknown, void>({
      query: () => ({ url: "/auth/logout-all", method: "POST", body: {} }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearCredentials());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    refresh: builder.mutation<unknown, void>({
      query: () => ({ url: "/auth/refresh", method: "POST", body: {} }),
      invalidatesTags: ["Auth"],
    }),
    me: builder.query<AuthUser, void>({
      query: () => "/auth/me",
      transformResponse: (response: AuthUser | { user: AuthUser }) => {
        const data = unwrapResponse<AuthUser | { user: AuthUser }>(response);
        return "user" in data ? data.user : data;
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          dispatch(clearCredentials());
        }
      },
      providesTags: ["Auth"],
    }),
    forgotPassword: builder.mutation<unknown, { email: string }>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: builder.mutation<unknown, { email: string; code: string; new_password: string }>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),
    verifyEmailOtp: builder.mutation<unknown, { email: string; code: string }>({
      query: (body) => ({ url: "/auth/verify-email-otp", method: "POST", body }),
    }),
    resendEmailOtp: builder.mutation<unknown, { email: string }>({
      query: (body) => ({ url: "/auth/resend-email-otp", method: "POST", body }),
    }),
    setup2FA: builder.mutation<{ secret: string; url: string }, void>({
      query: () => ({ url: "/auth/2fa/setup", method: "POST", body: {} }),
      transformResponse: unwrapResponse<{ secret: string; url: string }>,
      invalidatesTags: ["Auth"],
    }),
    verify2FA: builder.mutation<unknown, { code: string }>({
      query: (body) => ({ url: "/auth/2fa/verify", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),
    disable2FA: builder.mutation<unknown, void>({
      query: () => ({ url: "/auth/2fa/disable", method: "POST", body: {} }),
      invalidatesTags: ["Auth"],
    }),
    getSessions: builder.query<{ sessions: UserSession[] }, void>({
      query: () => "/auth/sessions",
      transformResponse: unwrapResponse<{ sessions: UserSession[] }>,
      providesTags: ["Sessions"],
    }),
    revokeSession: builder.mutation<unknown, string | number>({
      query: (id) => ({ url: `/auth/sessions/${id}`, method: "DELETE" }),
      invalidatesTags: ["Sessions"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useLogoutAllMutation,
  useRefreshMutation,
  useMeQuery,
  useLazyMeQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailOtpMutation,
  useResendEmailOtpMutation,
  useSetup2FAMutation,
  useVerify2FAMutation,
  useDisable2FAMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
} = authApi;
