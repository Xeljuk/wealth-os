import Anthropic from "@anthropic-ai/sdk";
import { getDatabase } from "@/server/db/client";
import { buildMonthlySnapshot } from "@/server/services/snapshot-builder";
import type { MonthlySnapshot } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTIONS = `You are Ethos Intelligence, a wealth strategist inside the Wealth OS app. You interpret a user's self-reported financial model — balance sheet, cash flow, goals, scenarios — and give clear, directional guidance.

Ground every answer in the user's actual numbers (included as JSON below). Quote figures exactly using the currency symbol from the profile. If a question cannot be answered from the data, say so and point to what's missing.

Structure the response as short sections with bold headings like "Understanding your position", "The math", "Assessment", "What I would not recommend". Prose, not bullet lists. Tight, editorial tone. Do not add disclaimers; the UI shows its own.

You are a planning tool, not a licensed advisor. Do not recommend specific securities.`;

function renderSnapshotContext(snapshot: MonthlySnapshot): string {
  return `USER FINANCIAL MODEL (period: ${snapshot.period})

${JSON.stringify(snapshot, null, 2)}`;
}

interface ChatRequest {
  question: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "missing_api_key", message: "ANTHROPIC_API_KEY not set on the server." },
      { status: 500 },
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return Response.json({ error: "missing_question" }, { status: 400 });
  }

  let snapshot: MonthlySnapshot;
  try {
    const db = getDatabase();
    snapshot = buildMonthlySnapshot(db, 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "snapshot_unavailable", message }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 64000,
          thinking: { type: "adaptive" },
          system: [
            { type: "text", text: SYSTEM_INSTRUCTIONS },
            {
              type: "text",
              text: renderSnapshotContext(snapshot),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: question }],
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[error: ${message}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
