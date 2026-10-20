import MarkdownIt from "markdown-it";

import { resolveStorageUrl } from "@/lib/blob";

/** Markdown renderer for question content; resolves "storage:" image sources to blob URLs. */
export function createQuestionMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true, breaks: true });

  const renderImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src");
    if (src) token.attrSet("src", resolveStorageUrl(String(src)));
    return renderImage(tokens, idx, options, env, self);
  };

  return md;
}
