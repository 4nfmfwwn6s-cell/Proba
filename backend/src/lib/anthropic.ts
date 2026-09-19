import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts.js";
import { parseChatResult } from "./correctionParser.js";
import type { ChatMessage, ChatTurnResult, ConversationMode, Difficulty } from "../types.js";

const MODEL = "claude-sonnet-5";

const CORRECTION_TOOL = {
  name: "respond_with_correction",
  description:
    "Respond to the learner with a natural conversational reply and a separate grammar/vocabulary correction assessment of their last message.",
  input_schema: {
    type: "object" as const,
    properties: {
      reply: {
        type: "string",
        description:
          "The natural spoken conversational reply, continuing the conversation. Never mentions grammar or corrections.",
      },
      correction: {
        type: "object",
        properties: {
          hasError: {
            type: "boolean",
            description: "True if the learner's last message had a grammar, vocabulary, word-order, or transcription error.",
          },
          original: {
            type: "string",
            description: "The learner's original sentence (verbatim). Empty string if hasError is false.",
          },
          corrected: {
            type: "string",
            description: "The corrected version of the learner's sentence. Empty string if hasError is false.",
          },
          explanationHu: {
            type: "string",
            description: "A one-sentence explanation of the mistake, written in Hungarian. Empty string if hasError is false.",
          },
          errorType: {
            type: "string",
            enum: ["grammar", "vocabulary", "word_order", "pronunciation_transcription", "other"],
            description: "Category of the error. Omit or ignore if hasError is false.",
          },
        },
        required: ["hasError"],
      },
    },
    required: ["reply", "correction"],
  },
};

async function callWithCorrectionTool(
  apiKey: string,
  system: string,
  messages: ChatMessage[]
): Promise<ChatTurnResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools: [CORRECTION_TOOL],
    tool_choice: { type: "tool", name: "respond_with_correction" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { reply: "Sorry, I had trouble responding. Could you try again?", correction: null };
  }

  return parseChatResult(toolUse.input);
}

export async function getChatCompletion(
  apiKey: string,
  history: ChatMessage[],
  mode: ConversationMode,
  difficulty: Difficulty
): Promise<ChatTurnResult> {
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const lastUserMessage = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const explainOnRequest = /\bexplain\b/i.test(lastUserMessage) || /magyar[aá]zd/i.test(lastUserMessage);

  return callWithCorrectionTool(apiKey, buildSystemPrompt(mode, difficulty, explainOnRequest), history);
}

// Generates the AI's opening line for sessions where the app speaks first -
// there is no real learner message yet, so the correction is always null.
export async function getOpeningReply(
  apiKey: string,
  mode: ConversationMode,
  difficulty: Difficulty
): Promise<ChatTurnResult> {
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const system = buildSystemPrompt(mode, difficulty, false, true);
  const kickoff: ChatMessage[] = [{ role: "user", content: "[SYSTEM: Start the conversation now.]" }];

  const result = await callWithCorrectionTool(apiKey, system, kickoff);
  return { reply: result.reply, correction: null };
}
