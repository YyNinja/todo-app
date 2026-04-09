import {
  Html,
  Body,
  Container,
  Heading,
  Text,
} from "@react-email/components";
import * as React from "react";

interface DigestTodo {
  title: string;
  priority: string;
  dueDate?: Date | null;
}

interface DailyDigestEmailProps {
  userName: string;
  todos: DigestTodo[];
}

const priorityLabel: Record<string, string> = {
  urgent: "🔴 Urgent",
  high: "🟠 High",
  medium: "🟡 Medium",
  low: "🟢 Low",
};

export default function DailyDigestEmail({ userName, todos }: DailyDigestEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  return (
    <Html>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px" }}>
            Your Daily Digest
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 24px" }}>
            Hi {userName}, here are your top tasks for today:
          </Text>

          {todos.map((todo, i) => (
            <div
              key={i}
              style={{ backgroundColor: "#f3f4f6", borderRadius: "6px", padding: "12px 16px", marginBottom: "12px" }}
            >
              <Text style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 4px" }}>
                {todo.title}
              </Text>
              <Text style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                {priorityLabel[todo.priority] ?? todo.priority}
                {todo.dueDate ? ` · Due ${new Date(todo.dueDate).toLocaleDateString()}` : ""}
              </Text>
            </div>
          ))}

          <Text style={{ margin: "24px 0 0" }}>
            <a
              href={appUrl}
              style={{ display: "inline-block", backgroundColor: "#4f46e5", color: "#ffffff", padding: "12px 24px", borderRadius: "6px", textDecoration: "none", fontWeight: "600", fontSize: "14px" }}
            >
              Open Todo App
            </a>
          </Text>
          <Text style={{ fontSize: "12px", color: "#9ca3af", margin: "24px 0 0" }}>
            You can manage your notification preferences in{" "}
            <a href={`${appUrl}/settings/notifications`} style={{ color: "#4f46e5" }}>
              settings
            </a>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
