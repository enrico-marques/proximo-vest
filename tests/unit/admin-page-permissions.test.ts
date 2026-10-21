import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const db = {
  user: { findUnique: vi.fn() },
  examBoard: { findUnique: vi.fn() },
  examEdition: { findUnique: vi.fn(), findMany: vi.fn() },
  examPhase: { findUnique: vi.fn(), findMany: vi.fn() },
  question: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
};

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const P = "@/app/(main)/dashboard/admin/provas-questoes";

// Each page that reads data guarded by a different permission than its own.
const cases = [
  {
    page: `${P}/[slug]/page`,
    params: { slug: "enem" },
    pagePerm: "examBoard.manage",
    dataPerm: "examEdition.read",
  },
  {
    page: `${P}/[slug]/createEdition/page`,
    params: { slug: "enem" },
    pagePerm: "examEdition.manage",
    dataPerm: "examBoard.read",
  },
  {
    page: `${P}/[slug]/[id]/page`,
    params: { slug: "enem", id: "1" },
    pagePerm: "examEdition.manage",
    dataPerm: "examPhase.read",
  },
  {
    page: `${P}/[slug]/[id]/createPhase/page`,
    params: { slug: "enem", id: "1" },
    pagePerm: "examPhase.manage",
    dataPerm: "examBoard.read",
  },
  {
    page: `${P}/[slug]/[id]/[idPhase]/page`,
    params: { slug: "enem", id: "1", idPhase: "2" },
    pagePerm: "examPhase.manage",
    dataPerm: "question.read",
  },
  {
    page: `${P}/[slug]/[id]/[idPhase]/createQuestion/page`,
    params: { slug: "enem", id: "1", idPhase: "2" },
    pagePerm: "question.create",
    dataPerm: "examPhase.read",
  },
];

type PageModule = { default: (props: { params: unknown; searchParams?: unknown }) => Promise<unknown> };

function signedInWith(perms: string[]) {
  getSession.mockResolvedValue({ user: { id: "admin-1" } });
  db.user.findUnique.mockResolvedValue({
    emailVerified: true,
    status: "active",
    roles: [],
    directPerms: perms.map((key) => ({ granted: true, permission: { key, isActive: true } })),
  });
}

function dataCalls() {
  return [db.examBoard, db.examEdition, db.examPhase, db.question].flatMap((model) =>
    Object.values(model).flatMap((fn) => fn.mock.calls),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("admin pages require the permission of the data they read", () => {
  it.each(cases)("$page redirects a user who only has $pagePerm", async ({ page, params, pagePerm }) => {
    signedInWith([pagePerm]);
    const { default: Page } = (await import(page)) as PageModule;

    await expect(Page({ params: Promise.resolve(params), searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT /dashboard",
    );
    expect(dataCalls()).toHaveLength(0);
  });

  it.each(cases)("$page lets in a user with $pagePerm and $dataPerm", async ({ page, params, pagePerm, dataPerm }) => {
    signedInWith([pagePerm, dataPerm]);
    const { default: Page } = (await import(page)) as PageModule;

    // Past the guard the page queries the (empty) database and renders its not-found state.
    await expect(Page({ params: Promise.resolve(params), searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NOT_FOUND",
    );
    expect(dataCalls().length).toBeGreaterThan(0);
  });
});

describe("phase question pagination", () => {
  it("sends a page past the end back to the last page", async () => {
    signedInWith(["examPhase.manage", "question.read"]);
    db.examPhase.findUnique.mockResolvedValue({ id: 2, phaseNumber: 1 });
    db.question.findMany.mockResolvedValue([]);
    db.question.count.mockResolvedValue(45);
    const { default: Page } = (await import(`${P}/[slug]/[id]/[idPhase]/page`)) as PageModule;

    await expect(
      Page({
        params: Promise.resolve({ slug: "enem", id: "1", idPhase: "2" }),
        searchParams: Promise.resolve({ page: "9", pageSize: "20" }),
      }),
    ).rejects.toThrow("REDIRECT /dashboard/admin/provas-questoes/enem/1/2?page=3&pageSize=20");
  });
});
