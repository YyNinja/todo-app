import {
  Html,
  Body,
  Container,
  Heading,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  userName: string;
}

export default function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  return (
    <Html>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 16px" }}>
            Welcome to Todo App!
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 16px" }}>
            Hi {userName},
          </Text>
          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 16px" }}>
            Your account is all set. Start organizing your tasks, set priorities, and never miss a due date.
          </Text>
          <Text style={{ margin: "0 0 16px" }}>
            <a
              href={appUrl}
              style={{ display: "inline-block", backgroundColor: "#4f46e5", color: "#ffffff", padding: "12px 24px", borderRadius: "6px", textDecoration: "none", fontWeight: "600", fontSize: "14px" }}
            >
              Get Started
            </a>
          </Text>
          <Text style={{ fontSize: "12px", color: "#9ca3af", margin: "24px 0 0" }}>
            You received this email because you signed up for Todo App.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
