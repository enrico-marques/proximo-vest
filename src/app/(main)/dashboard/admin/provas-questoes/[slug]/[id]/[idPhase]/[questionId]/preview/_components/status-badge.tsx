"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export function QuestionStatusBadge({
  initialStatus,
}: {
  initialStatus: StatusType;
}) {
  const [status, setStatus] = useState<StatusType>(initialStatus);

  // Evento customizado para atualizar status de fora
  useEffect(() => {
    function handleStatusChange(e: Event) {
      const next = (e as CustomEvent<{ status?: StatusType }>).detail?.status;
      if (next) {
        setStatus(next);
      }
    }
    window.addEventListener("question-status-changed", handleStatusChange);
    return () =>
      window.removeEventListener(
        "question-status-changed",
        handleStatusChange
      );
  }, []);

  const getVariant = (s: StatusType) => {
    switch (s) {
      case "PUBLISHED":
        return "default";
      case "ARCHIVED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Badge className="uppercase" variant={getVariant(status)}>
      {status}
    </Badge>
  );
}
