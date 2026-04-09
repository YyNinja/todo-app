import { Resend } from "resend";
import type { ReactElement } from "react";

// Lazy singleton — avoid module-level construction so Next.js build succeeds
// without RESEND_API_KEY (which is only required at runtime).
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail(
  to: string,
  subject: string,
  react: ReactElement
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "noreply@example.com";
  const { error } = await getResend().emails.send({ from, to, subject, react });
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
