import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const API_DIR = join(ROOT, "src", "app");
const SRC_DIR = join(ROOT, "src");

const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const WRAPPER_MODULE = "@/server/auth/define-route";

// Adding a public endpoint is a security decision: it must be listed here on purpose.
const EXPECTED_PUBLIC = [
  "api/auth/[...all] GET",
  "api/auth/[...all] POST",
  "api/auth/logout POST",
  "api/billing/webhook POST",
  "api/plans/available GET",
];

// Server actions are public POST endpoints; each file that declares them must be reviewed.
const EXPECTED_SERVER_ACTION_FILES = ["server/server-actions.ts"];

function walk(dir: string, match: (file: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : walk(full, match);
    return match(entry.name) ? [full] : [];
  });
}

const toPosix = (p: string) => p.split(sep).join("/");

type Handler = { method: string; access: "public" | "protected" };
type Analysis = { handlers: Handler[]; problems: string[] };

function analyzeRoute(file: string): Analysis {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const handlers: Handler[] = [];
  const problems: string[] = [];

  const importsWrapper = source.statements.some(
    (st) =>
      ts.isImportDeclaration(st) &&
      ts.isStringLiteral(st.moduleSpecifier) &&
      st.moduleSpecifier.text === WRAPPER_MODULE &&
      st.importClause?.namedBindings &&
      ts.isNamedImports(st.importClause.namedBindings) &&
      st.importClause.namedBindings.elements.some((el) => el.name.text === "defineRoute" && !el.propertyName),
  );

  const isExported = (node: ts.Node) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  for (const st of source.statements) {
    if (ts.isFunctionDeclaration(st) && isExported(st) && st.name && HTTP_METHODS.has(st.name.text)) {
      problems.push(`${st.name.text} is an exported function; wrap it with defineRoute`);
    }

    if (ts.isExportAssignment(st)) problems.push("default export is not allowed in route files");

    if (ts.isExportDeclaration(st)) {
      const names =
        st.exportClause && ts.isNamedExports(st.exportClause)
          ? st.exportClause.elements.map((el) => el.name.text)
          : ["*"];
      for (const name of names) {
        if (name === "*" || HTTP_METHODS.has(name)) problems.push(`re-export of ${name} bypasses defineRoute`);
      }
    }

    if (!ts.isVariableStatement(st) || !isExported(st)) continue;

    for (const decl of st.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) {
        problems.push("destructured exports are not allowed in route files");
        continue;
      }
      const method = decl.name.text;
      if (!HTTP_METHODS.has(method)) continue;

      const init = decl.initializer;
      const isWrapped =
        init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === "defineRoute";
      if (!isWrapped) {
        problems.push(`${method} is not built with defineRoute`);
        continue;
      }

      const [access] = init.arguments;
      if (access && ts.isStringLiteral(access) && access.text === "public") {
        handlers.push({ method, access: "public" });
      } else if (access && ts.isObjectLiteralExpression(access)) {
        handlers.push({ method, access: "protected" });
      } else {
        problems.push(`${method} must pass "public" or an inline access object to defineRoute`);
      }
    }
  }

  if (handlers.length > 0 && !importsWrapper) {
    problems.push(`defineRoute must be imported from "${WRAPPER_MODULE}"`);
  }
  if (handlers.length === 0 && problems.length === 0) problems.push("route file exports no handlers");

  return { handlers, problems };
}

const routeFiles = walk(API_DIR, (name) => /^route\.tsx?$/.test(name));
const routeId = (file: string) => toPosix(relative(API_DIR, file)).replace(/\/route\.tsx?$/, "");

describe("API route authorization coverage", () => {
  it("finds route files", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it.each(routeFiles.map((file) => [routeId(file), file]))("%s goes through defineRoute", (_id, file) => {
    expect(analyzeRoute(file).problems).toEqual([]);
  });

  it("only the expected routes are public", () => {
    const publicHandlers = routeFiles.flatMap((file) =>
      analyzeRoute(file)
        .handlers.filter((h) => h.access === "public")
        .map((h) => `${routeId(file)} ${h.method}`),
    );
    expect(publicHandlers.sort()).toEqual([...EXPECTED_PUBLIC].sort());
  });
});

describe("server actions", () => {
  it("are only declared in reviewed files", () => {
    const files = walk(SRC_DIR, (name) => /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts"))
      .filter((file) => /^\s*["']use server["']/m.test(readFileSync(file, "utf8")))
      .map((file) => toPosix(relative(SRC_DIR, file)));
    expect(files.sort()).toEqual([...EXPECTED_SERVER_ACTION_FILES].sort());
  });
});
