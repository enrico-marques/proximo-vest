// src/app/(main)/dashboard/professor/listas/_components/teacher-list-build-step.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import {
  SubjectOption,
  DifficultyOption,
  BoardOption,
  YearOption,
  QuestionDTO,
  SelectedQuestion,
} from "./types";
import { QuestionViewer } from "./question-viewer";

type Props = {
  selectedQuestions: SelectedQuestion[];
  setSelectedQuestions: React.Dispatch<
    React.SetStateAction<SelectedQuestion[]>
  >;
};

export function TeacherListBuildStep({
  selectedQuestions,
  setSelectedQuestions,
}: Props) {
  // filtros de config “estilo bloco”
  const [onlyNew, setOnlyNew] = useState(false);
  const [shuffleList, setShuffleList] = useState(false);

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultyOption[]>([]);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [years, setYears] = useState<YearOption[]>([]);

  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasQuestions = questions.length > 0;
  const currentQuestion: QuestionDTO | null = hasQuestions
    ? questions[currentIndex]
    : null;

  const selectedIds = useMemo(
    () => new Set(selectedQuestions.map((q) => q.id)),
    [selectedQuestions]
  );

  // carregar filtros
  useEffect(() => {
    async function loadFilters() {
      try {
        setIsLoadingFilters(true);
        const res = await fetch("/api/teacher-lists/filters");
        if (!res.ok) throw new Error("Erro ao carregar filtros");
        const data = await res.json();

        setSubjects(data.subjects ?? []);
        setDifficulties(data.difficulties ?? []);
        setBoards(data.boards ?? []);
        setYears(data.years ?? []);
      } catch (err) {
        console.error(err);
        toast.error(
          "Não foi possível carregar os filtros. Tente recarregar a página."
        );
      } finally {
        setIsLoadingFilters(false);
      }
    }

    void loadFilters();
  }, []);

  // carregar questões quando filtros mudam
  useEffect(() => {
    async function loadQuestions() {
      try {
        setIsLoadingQuestions(true);

        const params = new URLSearchParams();

        if (subjectFilter && subjectFilter !== "all") {
          params.set("subjectId", subjectFilter);
        }
        if (difficultyFilter && difficultyFilter !== "all") {
          params.set("difficulty", difficultyFilter);
        }
        if (boardFilter && boardFilter !== "all") {
          params.set("boardId", boardFilter);
        }
        if (yearFilter && yearFilter !== "all") {
          params.set("year", yearFilter);
        }
        if (searchTerm.trim()) params.set("q", searchTerm.trim());

        const res = await fetch(
          `/api/teacher-lists/questions?${params.toString()}`
        );
        if (!res.ok) throw new Error("Erro ao carregar questões");

        const data = (await res.json()) as QuestionDTO[];
        setQuestions(data);

        if (data.length === 0) {
          setCurrentIndex(0);
        } else if (currentIndex >= data.length) {
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error(err);
        toast.error(
          "Não foi possível carregar as questões. Ajuste os filtros ou tente novamente."
        );
      } finally {
        setIsLoadingQuestions(false);
      }
    }

    if (!isLoadingFilters) {
      void loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    subjectFilter,
    difficultyFilter,
    boardFilter,
    yearFilter,
    searchTerm,
    isLoadingFilters,
  ]);

  function goPrev() {
    if (!hasQuestions) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function goNext() {
    if (!hasQuestions) return;
    setCurrentIndex((prev) => (prev < questions.length - 1 ? prev + 1 : prev));
  }

  function handleAddCurrentQuestion() {
    if (!currentQuestion) return;

    setSelectedQuestions((prev) => {
      if (prev.some((q) => q.id === currentQuestion.id)) {
        toast.info("Essa questão já está na lista.");
        return prev;
      }
      toast.success("Questão adicionada à lista.");
      return [...prev, currentQuestion];
    });
  }

  function moveQuestion(id: number, direction: "up" | "down") {
    setSelectedQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === id);
      if (index === -1) return prev;

      const newList = [...prev];

      if (direction === "up" && index > 0) {
        [newList[index - 1], newList[index]] = [
          newList[index],
          newList[index - 1],
        ];
      }

      if (direction === "down" && index < newList.length - 1) {
        [newList[index + 1], newList[index]] = [
          newList[index],
          newList[index + 1],
        ];
      }

      return newList;
    });
  }

  function removeSelected(id: number) {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  // dificuldade "chips" estilo Fácil / Moderada / Difícil
  function setDifficultyChip(value: "all" | "easy" | "medium" | "hard") {
    if (value === "all") {
      setDifficultyFilter("all");
      return;
    }

    const map: Record<typeof value, string> = {
      easy: "EASY",
      medium: "MEDIUM",
      hard: "HARD",
    };

    setDifficultyFilter(map[value]);
  }

  const difficultyChip = (() => {
    if (difficultyFilter === "EASY") return "easy";
    if (difficultyFilter === "MEDIUM") return "medium";
    if (difficultyFilter === "HARD") return "hard";
    return "all";
  })();

  const yearsForSelectedBoard = React.useMemo(() => {
    if (years.length === 0) return [];

    // Se nenhuma instituição foi filtrada, mostrar anos únicos (todas as instituições)
    if (boardFilter === "all") {
      const seen = new Set<number>();
      return years.filter((y) => {
        if (seen.has(y.year)) return false;
        seen.add(y.year);
        return true;
      });
    }

    // Se tem instituição selecionada, só anos daquela instituição
    return years.filter((y) => String(y.boardId) === boardFilter);
  }, [years, boardFilter]);

  const selectedBoardLabel =
    boardFilter === "all"
      ? "Todas"
      : (boards.find((b) => String(b.id) === boardFilter)?.name ??
        "Filtrando…");

  const selectedYearLabel = yearFilter === "all" ? "Todos" : yearFilter;

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de configuração (estilo screenshot) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Configuração da lista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Linha 1 – filtros gerais */}
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
            <div className="space-y-1.5 text-xs">
              <Label>Instituições (exame)</Label>
              <Select
                value={boardFilter}
                onValueChange={(value) => {
                  setBoardFilter(value);
                  setYearFilter("all"); // sempre reseta o ano ao trocar a instituição
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 text-xs">
              <Label>Ano</Label>
              <Select
                value={yearFilter}
                onValueChange={setYearFilter}
                disabled={boardFilter === "all"} // desabilita quando não tem board
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue
                    placeholder={
                      boardFilter === "all"
                        ? "Selecione uma instituição"
                        : "Todos os anos"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {yearsForSelectedBoard.map((y) => (
                    <SelectItem
                      key={`${y.boardId}-${y.year}`}
                      value={String(y.year)}
                    >
                      {y.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {boardFilter === "all" && (
                <p className="text-[11px] text-muted-foreground">
                  Escolha uma instituição para filtrar por ano.
                </p>
              )}
            </div>
          </div>

          {/* Linha 2 – dificuldade chips */}
          <div className="space-y-1.5 text-xs">
            <Label>Dificuldade da lista</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={difficultyChip === "all" ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setDifficultyChip("all")}
              >
                Todas
              </Button>
              <Button
                type="button"
                size="sm"
                variant={difficultyChip === "easy" ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setDifficultyChip("easy")}
              >
                Fácil
              </Button>
              <Button
                type="button"
                size="sm"
                variant={difficultyChip === "medium" ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setDifficultyChip("medium")}
              >
                Moderada
              </Button>
              <Button
                type="button"
                size="sm"
                variant={difficultyChip === "hard" ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setDifficultyChip("hard")}
              >
                Difícil
              </Button>
              
            </div>
            <div className="mt-5 space-y-1.5 text-xs">
                <Label>Buscar palavras/texto</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Digite um termo do enunciado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
          </div>

          
        </CardContent>
      </Card>

      {/* Área principal – 3 colunas */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2.4fr)_minmax(0,1.8fr)]">
        {/* Coluna esquerda – disciplinas */}
        <Card className="h-[480px] flex flex-col">
          <CardHeader>
            <CardTitle>Bloco de questões</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha a disciplina para filtrar as questões disponíveis.
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {isLoadingFilters ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando disciplinas...
              </div>
            ) : subjects.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Nenhuma disciplina cadastrada.
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <button
                  type="button"
                  onClick={() => setSubjectFilter("all")}
                  className={`mb-1 w-full rounded px-2 py-1 text-left text-xs ${
                    subjectFilter === "all"
                      ? "bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  Todas as disciplinas
                </button>
                <div className="space-y-1">
                  {subjects.map((s) => {
                    const isActive = subjectFilter === String(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSubjectFilter(String(s.id))}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition ${
                          isActive
                            ? "bg-primary/10 font-medium text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          checked={isActive}
                          className="h-3 w-3"
                          onCheckedChange={() =>
                            setSubjectFilter(isActive ? "all" : String(s.id))
                          }
                        />
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Coluna central – viewer da questão (markdown) */}
        <Card className="h-[480px] flex flex-col">
          {/* barra topo tipo “Questão X de Y” */}
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goPrev}
                disabled={!hasQuestions || currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goNext}
                disabled={!hasQuestions || currentIndex >= questions.length - 1}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Questão</span>
              <span className="text-sm font-medium">
                {hasQuestions ? currentIndex + 1 : 0}{" "}
                <span className="text-xs text-muted-foreground">
                  de {questions.length}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasQuestions && (
                <span className="hidden text-xs text-muted-foreground lg:inline">
                  Lista atual:{" "}
                  <span className="font-semibold">
                    {selectedQuestions.length} questão(ões)
                  </span>
                </span>
              )}
              <Button
                type="button"
                size="sm"
                disabled={!currentQuestion}
                onClick={handleAddCurrentQuestion}
              >
                + Adicionar questão
              </Button>
            </div>
          </div>

          <CardContent className="flex-1 overflow-hidden px-4">
            {isLoadingQuestions ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando questões...
              </div>
            ) : !currentQuestion ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhuma questão encontrada com os filtros atuais.
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <QuestionViewer question={currentQuestion} />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Coluna direita – resumo / questões adicionadas */}
        <Card className="h-[480px] flex flex-col">
          <CardHeader className="space-y-3">
            <CardTitle>Resumo da lista</CardTitle>
            <div className="space-y-2 rounded-md bg-muted p-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Total de questões:</span>
                <span className="font-semibold">
                  {selectedQuestions.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Dificuldade:</span>
                <span className="font-medium">
                  {difficultyChip === "all"
                    ? "Mista"
                    : difficultyChip === "easy"
                      ? "Fácil"
                      : difficultyChip === "medium"
                        ? "Moderada"
                        : "Difícil"}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Questões na lista:</span>
              <span className="font-semibold">{selectedQuestions.length}</span>
            </div>

            {selectedQuestions.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Nenhuma questão selecionada ainda.
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <div className="space-y-2">
                  {selectedQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-2 rounded border bg-background px-3 py-2 text-xs"
                    >
                      <div className="mt-0.5 flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => moveQuestion(q.id, "up")}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === selectedQuestions.length - 1}
                          onClick={() => moveQuestion(q.id, "down")}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="h-5 px-1.5 text-[10px]">
                              {index + 1}.
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              Q{q.numberLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] text-destructive"
                            onClick={() => removeSelected(q.id)}
                          >
                            Remover
                          </button>
                        </div>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground">
                          {q.preview}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
