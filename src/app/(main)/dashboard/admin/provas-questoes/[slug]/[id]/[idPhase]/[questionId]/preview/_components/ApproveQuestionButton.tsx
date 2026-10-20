"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api-error";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export function ApproveQuestionButton({
  questionId,
  initialStatus,
}: {
  questionId: number;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [isPending, startTransition] = useTransition();

  if (status !== "DRAFT") return null;

  function handleApprove() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/question/${questionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PUBLISHED" }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error?.message || "Erro ao aprovar a questão."
          );
        }

        setStatus("PUBLISHED");

        // 🔥 EMITE EVENTO GLOBAL
        window.dispatchEvent(
          new CustomEvent("question-status-changed", {
            detail: { status: "PUBLISHED" },
          })
        );

        toast.success("Questão aprovada e publicada!");
      } catch (err) {
        toast.error(errorMessage(err) || "Erro ao aprovar a questão.");
      }
    });
  }

  return (
    <Button
      size="sm"
      onClick={handleApprove}
      disabled={isPending}
    >
      {isPending ? "Aprovando..." : "Aprovar questão"}
    </Button>
  );
}
