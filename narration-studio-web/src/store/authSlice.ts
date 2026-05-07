import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/lib/types";

export type AppError = {
  code: string;
  message: string;
  details?: unknown;
  status?: number;
};

type PendingLogin = {
  email: string;
  password?: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringSession: boolean;
  requires2FA: boolean;
  pendingLoginEmail: string | null;
  pendingLoginPassword?: string | null;
  rememberedEmail: string | null;
  lastLoginAt: string | null;
  error: AppError | null;
};

function loadRememberedEmail() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("narration_remember_email");
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoringSession: true,
  requires2FA: false,
  pendingLoginEmail: null,
  pendingLoginPassword: null,
  rememberedEmail: loadRememberedEmail(),
  lastLoginAt: null,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isRestoringSession = false;
      state.requires2FA = false;
      state.pendingLoginEmail = null;
      state.pendingLoginPassword = null;
      state.lastLoginAt = new Date().toISOString();
      state.error = null;
    },
    clearCredentials(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isRestoringSession = false;
      state.requires2FA = false;
      state.pendingLoginEmail = null;
      state.pendingLoginPassword = null;
    },
    setRestoringSession(state, action: PayloadAction<boolean>) {
      state.isRestoringSession = action.payload;
    },
    setRequires2FA(state, action: PayloadAction<boolean>) {
      state.requires2FA = action.payload;
    },
    setPendingLogin(state, action: PayloadAction<PendingLogin>) {
      state.pendingLoginEmail = action.payload.email;
      state.pendingLoginPassword = action.payload.password ?? null;
    },
    clearPendingLogin(state) {
      state.pendingLoginEmail = null;
      state.pendingLoginPassword = null;
    },
    setRememberedEmail(state, action: PayloadAction<string>) {
      state.rememberedEmail = action.payload;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("narration_remember_email", action.payload);
      }
    },
    clearRememberedEmail(state) {
      state.rememberedEmail = null;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("narration_remember_email");
      }
    },
    setAuthError(state, action: PayloadAction<AppError>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
});

export const {
  setCredentials,
  clearCredentials,
  setRestoringSession,
  setRequires2FA,
  setPendingLogin,
  clearPendingLogin,
  setRememberedEmail,
  clearRememberedEmail,
  setAuthError,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
