"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** クライアントでの描画（localStorage読込後）かどうか */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
