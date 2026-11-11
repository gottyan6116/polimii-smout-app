/**
 * 文書生成エンジンの抽象化。
 *
 * 現在は APIキー不要のルールベース `demoEngine` のみ。
 * 将来 LLM（Claude / OpenAI / AWS Bedrock 等）を使う場合は、
 * サーバー側の Route Handler（例: app/api/generate/route.ts）で `GenerationEngine` を実装し、
 * クライアントはその API を呼ぶ。APIキーはサーバーの環境変数だけで扱い、クライアントに渡さない。
 * LLMを使う場合も、数値は分析層（lib/analysis）が算出した値だけを渡し、
 * 生成文中の数値は figures と照合する（validate.ts）。
 */
import { buildDocument, type BuildInput, DEMO_ENGINE_ID } from "../documents/build";
import type { DocumentRecord } from "../documents/types";

export interface GenerationEngine {
  id: string;
  label: string;
  /** 生成AIによる推論を行うか。false の場合、UIで「ルールベース」と明示する */
  usesLLM: boolean;
  generateDocument(input: BuildInput): Promise<DocumentRecord>;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export const demoEngine: GenerationEngine = {
  id: DEMO_ENGINE_ID,
  label: "デモ用ルールエンジン（生成AIは使用していません）",
  usesLLM: false,
  async generateDocument(input) {
    return buildDocument(input, newId(), new Date().toISOString());
  },
};

export const engine: GenerationEngine = demoEngine;
