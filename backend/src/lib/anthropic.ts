import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts.js";
import { parseChatResult } from "./correctionParser.js";
import type { ChatMessage, ChatTurnResult, ConversationMode, Difficulty } from "../types.js";

const MODEL = "claude-sonnet-5";

const CORRECTION_TOOL = {
  name: "respond_with_correction",
  description:
    "Respond to the learner's turn: classify the input language and turn type, then give the appropriate response - a conversational reply with a grammar correction, an English translation answer, or a brief Hungarian meta-answer that steers back to English.",
  input_schema: {
    type: "object" as const,
    properties: {
      inputLanguage: {
        type: "string",
        enum: ["en", "hu"],
        description: "The language the learner's last message was actually written/spoken in.",
      },
      turnType: {
        type: "string",
        enum: ["conversation", "translation_request", "meta_question"],
        description:
          "conversation: the learner spoke English as part of the conversation. translation_request: the learner said something in Hungarian that wasn't a meta question - either explicitly asking how to say a phrase in English (e.g. 'Angolul hogy kell mondani...'), or just speaking Hungarian as their actual turn (an answer/comment/anything) instead of English, with no explicit 'how do I say' framing. meta_question: the learner said something in Hungarian that is a comment/question about the conversation or language itself, not content they're trying to communicate (e.g. 'mit jelent ez?', 'nem értem', 'mondd lassabban').",
      },
      reply: {
        type: "string",
        description:
          "Always spoken aloud in English, regardless of turnType - must never contain Hungarian text. For turnType=conversation: the natural spoken English conversational reply, continuing the conversation, never mentioning grammar or corrections. For turnType=translation_request: if the learner explicitly asked how to say something, a short English invitation to try saying it themselves; if they just spoke Hungarian as their turn (no explicit ask), a genuine English conversational continuation responding to what they said (as if they'd said translation.englishSentence in English) - not just an invitation to repeat it. For turnType=meta_question: a complete, level-appropriate English answer or rephrasing that actually addresses what the learner said, standing on its own without relying on metaReplyHu.",
      },
      correction: {
        type: "object",
        description: "Only meaningful when turnType=conversation; ignored for the other turn types.",
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
      translation: {
        type: "object",
        description: "Only present when turnType=translation_request; omit/leave empty otherwise.",
        properties: {
          englishSentence: {
            type: "string",
            description:
              "The natural, correct English translation of what the learner said - either the phrase they explicitly asked how to say, or the Hungarian sentence they actually spoke as their turn.",
          },
          hungarianNote: {
            type: "string",
            description:
              "A short Hungarian note about register/formality or a natural alternative phrasing, one sentence. Shown in writing only, never spoken aloud.",
          },
        },
      },
      metaReplyHu: {
        type: "string",
        description:
          "Only meaningful when turnType=meta_question: an OPTIONAL brief written Hungarian note, only if genuinely helpful alongside the English reply. Shown in writing only, never spoken aloud - the English reply must be sufficient on its own. Leave empty otherwise.",
      },
    },
    required: ["inputLanguage", "turnType", "reply", "correction"],
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
    return {
      reply: "Sorry, I had trouble responding. Could you try again?",
      correction: null,
      inputLanguage: "en",
      turnType: "conversation",
      translation: null,
      metaReplyHu: null,
    };
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
// there is no real learner message yet, so it's always a plain English
// conversation turn with no correction/translation/meta-answer.
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
  return {
    reply: result.reply,
    correction: null,
    inputLanguage: "en",
    turnType: "conversation",
    translation: null,
    metaReplyHu: null,
  };
}
