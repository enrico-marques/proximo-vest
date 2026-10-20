import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "./prisma";
import { sendMail } from "@/lib/mail"; // sua função para enviar e-mail

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
 sendResetPassword: async ({ user, url, token }, request) => {
      // Better Auth já criou o registro na tabela Verification pra esse token
      await sendMail({
        to: user.email,
        subject: "Redefinição de senha",
        html: `
          <p>Olá, ${user.name ?? user.email}!</p>
          <p>Você solicitou a redefinição da sua senha.</p>
          <p>Clique no link abaixo para criar uma nova senha:</p>
          <p><a href="${url}">Redefinir senha</a></p>
          <p>Se não foi você, pode ignorar este e-mail.</p>
        `,
      });
    },
  },

  // 2) Verificação de e-mail
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // Better Auth também usa a Verification pra esse token
      await sendMail({
        to: user.email,
        subject: "Confirme seu e-mail",
        html: `
          <p>Olá, ${user.name ?? user.email}!</p>
          <p>Para confirmar seu e-mail, clique no link abaixo:</p>
          <p><a href="${url}">Verificar e-mail</a></p>
        `,
      });
    },
    sendOnSignUp: true,            // manda sozinho após cadastro
    autoSignInAfterVerification: true,
    // expiresIn: 3600,            // opcional, em segundos (padrão 1h)
  },
   socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
      
    }
   },

  // Active in production. Built-in rules cap sign-in/sign-up at 3 per 10s and password reset or
  // verification e-mails at 3 per minute, per client IP. Counters live in the database so every
  // serverless instance shares them.
  rateLimit: {
    storage: "database",
  },

  advanced: {
    ipAddress: {
      // On Vercel this header holds a single client IP set by the edge, which better-auth trusts.
      // Behind another proxy, configure trustedProxies: without a resolvable IP all clients share
      // one bucket, and anyone could lock everyone out of sign-in.
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // só intercepta o login por email+senha
      if (ctx.path !== "/sign-in/email") return;

      const email = ctx.body?.email as string | undefined;
      if (!email) return; // deixa o fluxo normal validar

      // busca status do usuário
      const user = await prisma.user.findUnique({
        where: { email },
        select: { status: true, emailVerified: true },
      });

      // bloqueia se não existir ou não estiver "active"
      if (!user || user.status !== "active") {
        throw new APIError("UNAUTHORIZED", {
          message: "Sua conta está desativada. Fale com o suporte.",
        });
      }
    }),
  },
});