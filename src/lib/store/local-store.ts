"use client";

/**
 * localStorage を使ったデモ用の保存（useSyncExternalStore）。
 * 本番の保存・認証・アクセス制御の代わりにはならない（README参照）。
 */
import { useSyncExternalStore } from "react";
import type { FiscalYearId } from "../data/types";
import type { DocumentRecord } from "../documents/types";
import { EMPTY_PLAN, type PlanState } from "../planning/plan";

const PREFIX = "smout-qommons-demo:";

interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  serverSnapshot: T;
}

function createStore<T>(key: string, initial: T): Store<T> {
  const fullKey = PREFIX + key;
  const listeners = new Set<() => void>();
  let cacheRaw: string | null | undefined;
  let cacheValue: T = initial;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(fullKey);
    } catch {
      raw = null;
    }
    if (raw === cacheRaw) return cacheValue;
    cacheRaw = raw;
    if (raw === null) {
      cacheValue = initial;
    } else {
      try {
        cacheValue = JSON.parse(raw) as T;
      } catch {
        cacheValue = initial;
      }
    }
    return cacheValue;
  };

  const emit = () => listeners.forEach((l) => l());

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === fullKey) emit();
    });
  }

  return {
    get: () => (typeof window === "undefined" ? initial : read()),
    set(next) {
      const prev = read();
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        window.localStorage.setItem(fullKey, JSON.stringify(value));
      } catch {
        // 保存できない環境（プライベートモード等）ではメモリ上のみ更新
        cacheRaw = JSON.stringify(value);
        cacheValue = value;
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    serverSnapshot: initial,
  };
}

function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.serverSnapshot);
}

/* ---------------- 対象自治体・年度 ---------------- */

export interface WorkContext {
  municipalityId: string;
  fiscalYearId: FiscalYearId;
}

export const DEFAULT_CONTEXT: WorkContext = { municipalityId: "muni-a", fiscalYearId: "FY2025" };
export const contextStore = createStore<WorkContext>("context", DEFAULT_CONTEXT);
export const useWorkContext = () => useStore(contextStore);

/* ---------------- 文書 ---------------- */

export const documentStore = createStore<DocumentRecord[]>("documents", []);
export const useDocuments = () => useStore(documentStore);

export function saveDocument(doc: DocumentRecord) {
  documentStore.set((list) => {
    const others = list.filter((d) => d.id !== doc.id);
    return [doc, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });
}

export function deleteDocument(id: string) {
  documentStore.set((list) => list.filter((d) => d.id !== id));
}

/* ---------------- 次年度計画（自治体別） ---------------- */

export const planStore = createStore<Record<string, PlanState>>("plans", {});
export function usePlan(municipalityId: string): PlanState {
  const all = useStore(planStore);
  return all[municipalityId] ?? EMPTY_PLAN;
}

export function updatePlan(municipalityId: string, updater: (prev: PlanState) => PlanState) {
  planStore.set((all) => ({
    ...all,
    [municipalityId]: { ...updater(all[municipalityId] ?? EMPTY_PLAN), updatedAt: new Date().toISOString() },
  }));
}

export function getPlan(municipalityId: string): PlanState {
  return planStore.get()[municipalityId] ?? EMPTY_PLAN;
}
