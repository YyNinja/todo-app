import { Resend } from "resend";
import type { ReactElement } from "react";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

export const resend =
  globalForResend.resend ?? new Resend(process.env.RESEND_API_KEY);

if (process.env.NODE_ENV !== "production") globalForResend.resend = resend;

export async function sendEmail(
  to: string,
  subject: string,
  react: ReactElement
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "noreply@example.com";
  const { error } = await resend.emails.send({ from, to, subject, react });
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
