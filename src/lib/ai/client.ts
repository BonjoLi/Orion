import Anthropic from "@anthropic-ai/sdk";

// One model for every AI call (team decision: keep cost low).
// claude-sonnet-5-5: $2 / $10 per million input / output tokens.
// A plan call is ~3k in / ~500 out ≈ 1 cent.
export const MODEL = "claude-sonnet-5-5";

let client: Anthropic | null = null;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
