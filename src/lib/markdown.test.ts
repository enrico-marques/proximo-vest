import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { createQuestionMarkdown } from "./markdown";

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_BLOB_BASE_URL", "https://store123.public.blob.vercel-storage.com"));
afterEach(() => vi.unstubAllEnvs());

it("renders storage image references as blob URLs", () => {
  const html = createQuestionMarkdown().render("![gráfico](storage:questions/g.png)");
  expect(html).toContain('src="https://store123.public.blob.vercel-storage.com/questions/g.png"');
  expect(html).toContain('alt="gráfico"');
});

it("keeps external image URLs as they are", () => {
  const html = createQuestionMarkdown().render("![x](https://example.com/x.png)");
  expect(html).toContain('src="https://example.com/x.png"');
});
