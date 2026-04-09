import {
  Html,
  Body,
  Container,
  Heading,
  Text,
  Section,
} from "@react-email/components";
import * as React from "react";

interface WeeklyInsightsEmailProps {
  userName: string;
  weekOf: string;
  completedThisWeek: number;
  streak: number;
  topTags: string[];
  completionRatePercent: number;
  insight: string;
}

export default function WeeklyInsightsEmail({
  userName,
  weekOf,
  completedThisWeek,
  streak,
  topTags,
  completionRatePercent,
  insight,
}: WeeklyInsightsEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  return (
    <Html>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 4px" }}>
            Your Weekly Insights
          </Heading>
          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
            Week of {weekOf} · Hi {userName}!
          </Text>

          {/* Stats row */}
          <Section style={{ backgroundColor: "#f3f4f6", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "16px", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <Text style={{ fontSize: "28px", fontWeight: "700", color: "#4f46e5", margin: 0 }}>
                  {completedThisWeek}
                </Text>
                <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                  Completed
                </Text>
              </div>
              <div style={{ textAlign: "center" }}>
                <Text style={{ fontSize: "28px", fontWeight: "700", color: "#059669", margin: 0 }}>
                  {streak}🔥
                </Text>
                <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                  Day streak
                </Text>
              </div>
              <div style={{ textAlign: "center" }}>
                <Text style={{ fontSize: "28px", fontWeight: "700", color: "#d97706", margin: 0 }}>
                  {completionRatePercent}%
                </Text>
                <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                  Completion rate
                </Text>
              </div>
            </div>
          </Section>

          {/* AI Insight */}
          <Section style={{ backgroundColor: "#eef2ff", borderRadius: "8px", padding: "20px", marginBottom: "24px", borderLeft: "4px solid #4f46e5" }}>
            <Text style={{ fontSize: "12px", fontWeight: "700", color: "#4f46e5", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              AI Coach Insight
            </Text>
            <Text style={{ fontSize: "15px", color: "#1e1b4b", margin: 0, lineHeight: "1.6" }}>
              {insight}
            </Text>
          </Section>

          {/* Top categories */}
          {topTags.length > 0 && (
            <Section style={{ marginBottom: "24px" }}>
              <Text style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 10px" }}>
                Top categories this week
              </Text>
              <div>
                {topTags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#e0e7ff",
                      color: "#3730a3",
                      fontSize: "12px",
                      fontWeight: "600",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      marginRight: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Text style={{ margin: "24px 0 0" }}>
            <a
              href={`${appUrl}/analytics`}
              style={{
                display: "inline-block",
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              View Full Analytics
            </a>
          </Text>

          <Text style={{ fontSize: "12px", color: "#9ca3af", margin: "24px 0 0" }}>
            Manage notification preferences in{" "}
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
