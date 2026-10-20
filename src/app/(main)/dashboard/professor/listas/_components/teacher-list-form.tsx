// src/app/(main)/dashboard/professor/listas/_components/teacher-list-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  SelectedQuestion,
  TeacherListInitialData,
} from "./types";
import { TeacherListBuildStep } from "./teacher-list-build-step";
import { readApiError, errorMessage } from "@/lib/api-error";

type Props = {
  initialData?: TeacherListInitialData;
};

type Step = 1 | 2;

export function TeacherListForm({ initialData }: Props) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const [step, setStep] = useState<Step>(initialData ? 2 : 1);

  const [name, setName] = useState(initialData?.name ?? "");
  const [teacherName, setTeacherName] = useState(
    initialData?.teacherName ?? "",
  );
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );

  const [selectedQuestions, setSelectedQuestions] = useState<
    SelectedQuestion[]
  >(initialData?.questions ?? []);

  function goToStep2() {
    if (!name.trim()) {
      toast.error("Dê um nome para a lista antes de continuar.");
      return;
    }
    if (!teacherName.trim()) {
      toast.error("Informe o nome do professor antes de continuar.");
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Dê um nome para a lista.");
      setStep(1);
      return;
    }

    if (!teacherName.trim()) {
      toast.error("Informe o nome do professor.");
      setStep(1);
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error("Selecione pelo menos uma questão para a lista.");
      setStep(2);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        teacherName: teacherName.trim(),
        questionIds: selectedQuestions.map((q) => q.id),
      };

      const url = isEditMode
        ? `/api/teacher-lists/${initialData!.id}`
        : "/api/teacher-lists";

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(
          await readApiError(res, isEditMode ? "Erro ao atualizar a lista." : "Erro ao criar a lista."),
        );
      }

      toast.success(
        isEditMode ? "Lista atualizada com sucesso." : "Lista criada!",
      );

      router.push("/dashboard/professor/listas");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err) || "Erro ao salvar a lista.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      {/* Cabeçalho geral */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEditMode ? "Editar lista de professor" : "Nova lista de professor"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === 1
            ? "Preencha as informações básicas da lista."
            : "Configure os filtros e escolha manualmente as questões que farão parte da lista."}
        </p>
      </div>

      {/* Indicador simples de etapa */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-1 ${
            step === 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          1. Informações
        </span>
        <span className="h-px flex-1 bg-border" />
        <span
          className={`rounded-full px-2 py-1 ${
            step === 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          2. Configuração & seleção de questões
        </span>
      </div>

      {/* ==================== ETAPA 1 – INFO ==================== */}
      {step === 1 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Informações da lista</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da lista</Label>
                <Input
                  id="name"
                  placeholder="Ex.: Lista 01 — Funções (1º EM)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacherName">Nome do professor(a)</Label>
                <Input
                  id="teacherName"
                  placeholder="Ex.: Prof. Ana Souza"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">
                  Descrição (opcional – só aparece para você)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Ex.: Lista para aplicar na turma 1º EM A na próxima semana."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse items-center justify-between gap-3 border-t pt-4 md:flex-row">
            <p className="text-xs text-muted-foreground">
              Você poderá configurar filtros e escolher as questões na próxima etapa.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/professor/listas")}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={goToStep2}
              >
                Avançar para configuração
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ==================== ETAPA 2 – CONFIGURAÇÃO & QUESTÕES ==================== */}
      {step === 2 && (
        <>
          <TeacherListBuildStep
            selectedQuestions={selectedQuestions}
            setSelectedQuestions={setSelectedQuestions}
          />

          <div className="flex flex-col-reverse items-center justify-between gap-3 border-t pt-4 md:flex-row">
            <p className="text-xs text-muted-foreground">
              Total de questões na lista:{" "}
              <span className="font-semibold">
                {selectedQuestions.length}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Voltar para informações
              </Button>
              <Button type="submit">
                {isEditMode ? "Salvar alterações" : "Criar lista"}
              </Button>
            </div>
          </div>
        </>
      )}
    </form>
  );
}
