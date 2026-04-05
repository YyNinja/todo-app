import Anthropic from "@anthropic-ai/sdk";

const globalForAI = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAI.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production") globalForAI.anthropic = anthropic;

export interface ParsedTodo {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  tags: string[];
}

export async function parseTodoFromNaturalLanguage(
  input: string
): Promise<ParsedTodo> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Parse this natural language todo into a structured format. Return ONLY valid JSON with these fields:
- title: concise task title (string)
- description: optional details (string or null)
- priority: one of "low", "medium", "high", "urgent" based on urgency/importance
- dueDate: ISO date string if mentioned, null otherwise
- tags: array of relevant category tags (e.g. ["work", "email"])

Input: "${input}"`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");

  return JSON.parse(jsonMatch[0]) as ParsedTodo;
}

export interface TodoPrioritization {
  todoId: string;
  score: number;
  reasoning: string;
}

export async function prioritizeTodos(
  todos: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: Date | null;
    tags: string[];
  }>
): Promise<TodoPrioritization[]> {
  if (todos.length === 0) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Today is ${new Date().toISOString().split("T")[0]}.

Prioritize these todos and return a JSON array where each item has:
- todoId: the todo's id
- score: 0-100 priority score (higher = more urgent)
- reasoning: brief explanation (1 sentence)

Todos:
${JSON.stringify(todos, null, 2)}

Return ONLY valid JSON array.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in AI response");

  return JSON.parse(jsonMatch[0]) as TodoPrioritization[];
}
