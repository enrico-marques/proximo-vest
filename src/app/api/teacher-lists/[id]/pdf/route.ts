// app/api/teacher-lists/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";

export const runtime = "nodejs";

// markdown bem simples: quebra texto x imagens ![alt](url)
type MarkdownPart =
  | { type: "text"; content: string }
  | { type: "image"; alt: string; src: string };

/**
 * Quebra um markdown em blocos de texto e imagens ![alt](url)
 */
function splitMarkdownImages(markdown: string): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  if (!markdown.trim()) return parts;

  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(markdown)) !== null) {
    // texto antes da imagem
    if (match.index > lastIndex) {
      const before = markdown.slice(lastIndex, match.index);
      if (before.trim()) {
        parts.push({ type: "text", content: before });
      }
    }

    const alt = match[1] ?? "";
    const src = match[2] ?? "";
    if (src) {
      parts.push({ type: "image", alt, src });
    }

    lastIndex = imageRegex.lastIndex;
  }

  // resto de texto depois da última imagem
  if (lastIndex < markdown.length) {
    const tail = markdown.slice(lastIndex);
    if (tail.trim()) {
      parts.push({ type: "text", content: tail });
    }
  }

  // se nada foi reconhecido, devolve tudo como texto
  if (parts.length === 0) {
    parts.push({ type: "text", content: markdown });
  }

  return parts;
}

/**
 * Renderiza um "bloco de markdown" no PDF:
 *  - texto: como parágrafo justificado
 *  - imagem: baixa a URL e desenha via data URL
 */
async function drawMarkdownBlock(
  doc: PDFKit.PDFDocument,
  markdown: string,
  options?: {
    indent?: number;
    fontSize?: number;
  },
) {
  const fontSize = options?.fontSize ?? 10;
  const indent = options?.indent ?? 0;

  const parts = splitMarkdownImages(markdown);

  for (const part of parts) {
    if (part.type === "text") {
      const text = part.content
        .replace(/\s+/g, " ")
        .replace(/ ?\n ?/g, " ")
        .trim();

      if (!text) continue;

      doc
        .fontSize(fontSize)
        .text(text, {
          align: "justify",
          indent,
          paragraphGap: 4,
        });

      doc.moveDown(0.2);
      continue;
    }

    // IMAGEM
    const src = part.src.trim();
    if (!src) continue;

    try {
      // baixa a imagem
      const res = await fetch(src);
      if (!res.ok) {
        // apenas loga, não quebra o PDF
        // eslint-disable-next-line no-console
        console.warn("[PDF] Falha ao buscar imagem:", src, res.status);
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString("base64");

      // inferência bem simples de MIME pelo final da URL
      let mime = "image/png";
      const lower = src.toLowerCase();
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
      else if (lower.endsWith(".gif")) mime = "image/gif";
      else if (lower.endsWith(".webp")) mime = "image/webp";

      const dataUrl = `data:${mime};base64,${base64}`;

      // centraliza dentro da área útil
      doc.moveDown(0.3);
      doc.image(dataUrl, {
        fit: [380, 220],
        align: "center",
        valign: "center",
      });
      doc.moveDown(0.5);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[PDF] Erro ao desenhar imagem:",
        src,
        err instanceof Error ? err.message : err,
      );
      // segue a vida, não vamos quebrar o PDF por causa disso
      continue;
    }
  }
}

/**
 * Fallback pra limpar HTML em casos antigos (se necessário)
 */
function htmlToPlain(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type Params = { id: string };

export const GET = defineRoute<Params>({ perm: "teacherList.manage" }, async (req, { params, user }) => {
  const { id } = params;

  const { searchParams } = new URL(req.url);
  const withAnswers = searchParams.get("withAnswers") === "1";

  // Busca a lista do professor
  const list = await prisma.teacherList.findFirst({
    where: {
      id,
      teacherId: user.id,
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              stimulus: true,
              mcq: {
                include: { options: true },
              },
              fr: true,
            },
          },
        },
      },
    },
  });

  if (!list) {
    return NextResponse.json(
      { error: "Lista não encontrada" },
      { status: 404 },
    );
  }

  // ================== CRIA DOCUMENTO ==================
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // ================== CABEÇALHO ==================
  doc.fontSize(14).text("PRÓXIMO VEST", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(16).text(list.name, { align: "center" });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .text(`Professor(a): ${list.teacherName || "-"}`, { align: "center" });

  doc.moveDown(0.5);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();

  doc.moveDown(0.8);
  doc.fontSize(10);
  doc.text("Nome do aluno: ___________________________________________");
  doc.moveDown(0.3);
  doc.text("Turma: __________________    Data: ____/____/________");
  doc.moveDown(1);

  // ================== QUESTÕES ==================
  for (let index = 0; index < list.questions.length; index++) {
    const item = list.questions[index];
    const q = item.question;
    const num = index + 1;

    // Título da questão
    doc.fontSize(11).text(`Questão ${num}`, { continued: false });
    doc.moveDown(0.3);

    // Enunciado / estímulo em markdown (preferencial)
    const stimulusMarkdown =
      (q.stimulus?.contentText && q.stimulus.contentText.trim().length > 0
        ? q.stimulus.contentText
        : q.stimulus?.contentHtml) || "";

    if (stimulusMarkdown) {
      await drawMarkdownBlock(doc, stimulusMarkdown, {
        fontSize: 10,
      });
      doc.moveDown(0.4);
    } else {
      // fallback antigo: só texto plano
      const stimText = htmlToPlain(q.stimulus?.contentHtml ?? "");
      if (stimText) {
        doc.fontSize(10).text(stimText, { align: "justify" });
        doc.moveDown(0.4);
      }
    }

    // Múltipla escolha
    if (q.mcq) {
      const options = [...q.mcq.options].sort((a, b) =>
        a.label.localeCompare(b.label),
      );

      for (const opt of options) {
        const label = opt.label; // A, B, C...
        const textMarkdown =
          opt.textPlain && opt.textPlain.trim().length > 0
            ? opt.textPlain
            : opt.textHtml || "";

        // Linha: "A)" + markdown da alternativa
        doc.fontSize(10).text(`${label}) `, {
          continued: true,
          indent: 10,
        });

        if (textMarkdown) {
          await drawMarkdownBlock(doc, textMarkdown, {
            fontSize: 10,
            indent: 0,
          });
        } else {
          doc.text("(sem texto)");
        }

        doc.moveDown(0.1);
      }

      doc.moveDown(0.8);
    } else if (q.isDiscursive || q.fr) {
      // Discursiva: espaço pra resposta
      doc.fontSize(10).text("Resposta:", { continued: false });
      doc.moveDown(0.3);

      const lines = 5;
      for (let i = 0; i < lines; i++) {
        doc.text("_______________________________________________");
      }
      doc.moveDown(0.8);
    } else {
      doc.moveDown(0.6);
    }

    // quebra de página se estiver muito embaixo
    if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
      doc.addPage();
    }
  }

  // ================== GABARITO ==================
  if (withAnswers) {
    doc.addPage();
    doc.fontSize(14).text("Gabarito", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10);

    list.questions.forEach((item, index) => {
      const q = item.question;
      const num = index + 1;

      let answer = "";
      if (q.mcq) {
        answer = (q.mcq.correctOptionKey as string) || "";
      } else if (q.isDiscursive || q.fr) {
        answer = "Discursiva";
      } else {
        answer = "—";
      }

      doc.text(`Questão ${num}: ${answer}`);
    });
  }

  doc.end();
  const pdfBuffer = await done;

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lista-${list.id}.pdf"`,
    },
  });
});
