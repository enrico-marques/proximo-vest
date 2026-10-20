import { Resend } from "resend";

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY não configurada");
    return;
  }

  try {
    // Created per call: the constructor throws without a key, which would break every module
    // importing this one (auth included) on setups without e-mail.
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.MAIL_FROM ?? "No Reply <no-reply@example.com>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    // aqui você pode integrar com algum logger, Sentry, etc
  }
}
