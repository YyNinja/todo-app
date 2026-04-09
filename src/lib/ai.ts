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

// ── Daily Briefing ──────────────────────────────────────────────────────────

export interface DailyBriefing {
  summary: string;
  topPriorities: string[];
  insights: string;
}

export async function getDailyBriefing(
  todos: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: Date | null;
    completed: boolean;
    tags: string[];
  }>
): Promise<DailyBriefing> {
  const activeTodos = todos.filter((t) => !t.completed);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Today is ${new Date().toISOString().split("T")[0]}.

Generate a daily briefing for these ${activeTodos.length} active tasks. Return ONLY valid JSON with:
- summary: 1-2 sentence overview of the day's workload
- topPriorities: array of 3 task titles to focus on today (most important/urgent first)
- insights: 1 sentence of actionable advice for the day

Tasks:
${JSON.stringify(activeTodos, null, 2)}

Return ONLY valid JSON.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");

  return JSON.parse(jsonMatch[0]) as DailyBriefing;
}

// ── Task Breakdown ──────────────────────────────────────────────────────────

export async function breakdownTask(todo: {
  id: string;
  title: string;
  description?: string | null;
}): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Break down this task into 3-7 concrete subtasks. Return ONLY a JSON array of short subtask title strings.

Task: "${todo.title}"${todo.description ? `\nDescription: "${todo.description}"` : ""}

Return ONLY a JSON array of strings, e.g. ["subtask 1", "subtask 2"]`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in AI response");

  return JSON.parse(jsonMatch[0]) as string[];
}

// ── Smart Scheduling ────────────────────────────────────────────────────────

export interface DueDateSuggestion {
  date: string;
  reasoning: string;
}

export async function suggestDueDate(
  todo: { id: string; title: string; priority: string },
  existingTodos: Array<{ title: string; dueDate?: Date | null; priority: string }>
): Promise<DueDateSuggestion> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Today is ${new Date().toISOString().split("T")[0]}.

Suggest a due date for this task, considering existing workload. Return ONLY valid JSON with:
- date: ISO date string (YYYY-MM-DD)
- reasoning: 1 sentence explaining the choice

Task: "${todo.title}" (priority: ${todo.priority})

Existing tasks with due dates:
${JSON.stringify(
  existingTodos.filter((t) => t.dueDate).map((t) => ({ title: t.title, dueDate: t.dueDate, priority: t.priority })),
  null,
  2
)}

Return ONLY valid JSON.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");

  return JSON.parse(jsonMatch[0]) as DueDateSuggestion;
}

// ── Productivity Insight ─────────────────────────────────────────────────────

export interface ProductivityStats {
  weekStart: string;
  completedThisWeek: number;
  totalActive: number;
  streak: number;
  topTags: string[];
  completionRatePercent: number;
  bestDay?: string;
}

export async function generateProductivityInsight(
  stats: ProductivityStats
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are a productivity coach. Generate a concise, encouraging, and personalized productivity insight for this user based on their weekly stats. Be specific and actionable. Keep it to 2-3 sentences max.

Week of: ${stats.weekStart}
Tasks completed this week: ${stats.completedThisWeek}
Active tasks remaining: ${stats.totalActive}
Current streak: ${stats.streak} day${stats.streak === 1 ? "" : "s"}
Completion rate: ${stats.completionRatePercent}%
Top categories: ${stats.topTags.length > 0 ? stats.topTags.join(", ") : "none"}
${stats.bestDay ? `Most productive day: ${stats.bestDay}` : ""}

Respond with ONLY the insight text, no quotes or prefixes.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");
  return content.text.trim();
}

// ── Semantic Search ─────────────────────────────────────────────────────────

export async function semanticSearchTodos(
  query: string,
  todos: Array<{ id: string; title: string; description?: string | null; tags: string[] }>
): Promise<string[]> {
  if (todos.length === 0) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Find todos that are semantically relevant to the search query. Return ONLY a JSON array of todo IDs, ordered from most to least relevant. Include only genuinely relevant results.

Query: "${query}"

Todos:
${JSON.stringify(todos.map((t) => ({ id: t.id, title: t.title, description: t.description, tags: t.tags })), null, 2)}

Return ONLY a JSON array of matching todo ID strings.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response type");

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  return JSON.parse(jsonMatch[0]) as string[];
}
