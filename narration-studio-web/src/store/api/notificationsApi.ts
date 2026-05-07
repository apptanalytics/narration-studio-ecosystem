import { baseApi, unwrapResponse } from "@/store/api/baseApi";
import type { NotificationRecord } from "@/lib/types";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    notifications: builder.query<{ notifications: NotificationRecord[]; unread: number }, void>({
      query: () => "/notifications",
      transformResponse: unwrapResponse<{ notifications: NotificationRecord[]; unread: number }>,
      providesTags: ["Notifications"],
    }),
    markNotificationsRead: builder.mutation<unknown, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH", body: {} }),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: builder.mutation<unknown, string | number>({
      query: (id) => ({ url: `/notifications/${id}`, method: "DELETE" }),
      invalidatesTags: ["Notifications"],
    }),
    clearNotifications: builder.mutation<unknown, void>({
      query: () => ({ url: "/notifications", method: "DELETE" }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useNotificationsQuery,
  useMarkNotificationsReadMutation,
  useDeleteNotificationMutation,
  useClearNotificationsMutation,
} = notificationsApi;
