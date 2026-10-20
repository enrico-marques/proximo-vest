// src/app/(main)/dashboard/professor/listas/_components/question-viewer.tsx
"use client";

import React from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveStorageUrl } from "@/lib/blob";

import { QuestionDTO } from "./types";

// Question markdown stores images as "storage:<pathname>"; resolve them before the default URL sanitizing.
const questionUrlTransform = (url: string) => defaultUrlTransform(resolveStorageUrl(url));

type Props = {
  question: QuestionDTO;
};

export function QuestionViewer({ question }: Props) {
  const { body, options, isDiscursive, difficulty, subjects } = question;
  const numberLabel = question.numberLabel ?? "?";

  const isObjective = !isDiscursive;

  return (
    <Card className="border-primary/10 shadow-sm">
      {/* Cabeçalho do card */}
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            {/* bolinha com o número da questão */}
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {numberLabel}
            </span>

            <div className="flex flex-col">
              <span className="text-sm font-medium">
                Questão {isObjective ? "objetiva" : "discursiva"}
              </span>

              {/* Subjects logo abaixo do título */}
              {subjects && subjects.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {subjects.map((s) => s.name).join(" • ")}
                </span>
              )}

              {/* Dificuldade (se existir) */}
              {difficulty && (
                <span className="text-[11px] text-muted-foreground">
                  Dificuldade:{" "}
                  {difficulty.toLowerCase().replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Enunciado / estímulo */}
        <section className="space-y-2">
          <div
            className="
              rounded-xl border bg-card/80 px-5 py-4 shadow-sm
              prose prose-base max-w-none
              prose-headings:mb-2 prose-headings:mt-4 prose-headings:text-foreground
              prose-p:text-[15px] prose-p:leading-relaxed
              prose-strong:font-semibold
              prose-ul:list-disc prose-ul:pl-5 prose-li:my-1
              prose-ol:list-decimal prose-ol:pl-5
              prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:pl-4
              prose-img:my-4 prose-img:rounded-md prose-img:shadow-md
              dark:prose-invert
            "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={questionUrlTransform}
              skipHtml={false}
              components={{
                p: ({ node, ...props }) => (
                  <p {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li {...props} />
                ),
                img: ({ node, ...props }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    {...props}
                    className="my-4 max-h-80 w-auto max-w-full rounded-md border object-contain shadow-md"
                  />
                ),
              }}
            >
              {body || question.preview}
            </ReactMarkdown>
          </div>
        </section>

        {/* Objetiva (MCQ) */}
        {isObjective && options && options.length > 0 && (
          <section className="space-y-2">
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <button
                  key={`${numberLabel}-${opt.label}-${idx}`}
                  type="button"
                  disabled
                  className="flex w-full items-start gap-3 rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted/60 disabled:cursor-default"
                >
                  {/* bolinha da alternativa */}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border bg-muted/80 text-xs font-semibold">
                    {opt.label}
                  </span>

                  {/* texto markdown da alternativa */}
                  <div
                    className="
                      prose prose-sm max-w-none dark:prose-invert
                      prose-p:my-0 prose-p:leading-snug
                      prose-ul:my-1 prose-ol:my-1
                    "
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      urlTransform={questionUrlTransform}
                      skipHtml={false}
                      components={{
                        p: ({ node, ...props }) => (
                          <p {...props} />
                        ),
                        img: ({ node, ...props }) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            {...props}
                            className="my-2 max-h-[260px] w-auto max-w-full rounded-md border object-contain shadow-sm"
                          />
                        ),
                      }}
                    >
                      {opt.text}
                    </ReactMarkdown>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Discursiva – espaço de resposta fake */}
        {!isObjective && (!options || options.length === 0) && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground tracking-tight">
              Resposta do aluno
            </h2>
            <div className="space-y-2">
              <textarea
                className="min-h-40 w-full resize-y rounded-md border bg-muted px-3 py-2 text-sm outline-none"
                placeholder="Aqui o aluno digitará a resposta..."
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                Campo exibido apenas como pré-visualização (não editável aqui).
              </p>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
