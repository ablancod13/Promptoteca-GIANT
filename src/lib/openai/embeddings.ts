import OpenAI from "openai";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

export async function createEmbedding(input: string): Promise<EmbeddingResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !input.trim()) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined
  });

  const model = process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const response = await client.embeddings.create({
    model,
    input,
    encoding_format: "float"
  });

  return {
    embedding: response.data[0]?.embedding ?? [],
    model
  };
}
