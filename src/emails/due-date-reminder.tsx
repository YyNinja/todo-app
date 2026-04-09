import {
  Html,
  Body,
  Container,
  Heading,
  Text,
} from "@react-email/components";
import * as React from "react";

interface ReminderTodo {
  title: string;
  dueDate: Date;
}

interface DueDateReminderEmailProps {
  userName: string;
  todos: ReminderTodo[];
}

export default function DueDateReminderEmail({ userName, todos }: DueDateReminderEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  return (
    <Html>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px" }}>
            Tasks Due Soon
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 24px" }}>
            Hi {userName}, these tasks are coming up:
          </Text>

          {todos.map((todo, i) => (
            <div
              key={i}
              style={{ backgroundColor: "#fef3c7", borderRadius: "6px", padding: "12px 16px", marginBottom: "12px", borderLeft: "4px solid #f59e0b" }}
            >
              <Text style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 4px" }}>
                {todo.title}
              </Text>
              <Text style={{ fontSize: "13px", color: "#92400e", margin: 0 }}>
                Due {new Date(todo.dueDate).toLocaleString()}
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
