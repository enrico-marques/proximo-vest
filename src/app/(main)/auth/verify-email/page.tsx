import { redirect } from "next/navigation";

import { getSessionOrNull } from "@/utils/access";

import { ResendVerificationButton } from "../_components/resend-verification-button";

export default async function VerifyEmailPage() {
  const session = await getSessionOrNull();
  if (!session?.user) redirect("/auth/login");
  if (session.user.emailVerified) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-medium">Confirme seu e-mail</h1>
        <p className="text-muted-foreground text-sm">
          Enviamos um link de confirmação para <span className="text-foreground">{session.user.email}</span>. Abra o
          e-mail e clique no link para continuar.
        </p>
      </div>
      <ResendVerificationButton email={session.user.email} />
    </div>
  );
}
