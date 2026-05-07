"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { useAppDispatch } from "@/store/hooks";
import { setRestoringSession } from "@/store/authSlice";
import { useMeQuery } from "@/store/api/authApi";

function SessionRestorer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isFetching, isUninitialized } = useMeQuery();

  useEffect(() => {
    dispatch(setRestoringSession(isFetching || isUninitialized));
  }, [dispatch, isFetching, isUninitialized]);

  return children;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionRestorer>{children}</SessionRestorer>
    </Provider>
  );
}
