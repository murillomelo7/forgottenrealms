import OpenAI from "openai";

const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "An OpenAI API key must be set. " +
      "Provide AI_INTEGRATIONS_OPENAI_API_KEY (Replit AI integration) " +
      "or OPENAI_API_KEY (standard OpenAI key).",
  );
}

export const openai = new OpenAI({
  apiKey,
  ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
    ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }
    : {}),
});
