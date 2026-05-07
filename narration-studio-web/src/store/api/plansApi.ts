import { baseApi, unwrapResponse } from "@/store/api/baseApi";
import type { PricingPlan } from "@/lib/types";

export const plansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    plans: builder.query<{ plans: PricingPlan[] }, void>({
      query: () => "/plans",
      transformResponse: unwrapResponse<{ plans: PricingPlan[] }>,
      providesTags: ["Plans"],
    }),
    adminPlans: builder.query<{ plans: PricingPlan[] }, void>({
      query: () => "/admin/plans",
      transformResponse: unwrapResponse<{ plans: PricingPlan[] }>,
      providesTags: ["Plans"],
    }),
  }),
});

export const { usePlansQuery, useAdminPlansQuery } = plansApi;
