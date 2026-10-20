# Próximo Vest

Plataforma de questões de vestibular (ENEM, Fuvest, Unicamp e outras bancas) para alunos e professores. O banco de questões é curado por admins; o professor monta listas e gera PDF. As diretrizes do projeto, o roadmap e as regras de segurança estão em [`CLAUDE.md`](CLAUDE.md).

## Stack

Next.js (App Router) + React · TypeScript · Prisma ORM + Prisma Postgres · better-auth · Tailwind CSS + shadcn/ui · Zod · Stripe · Vercel Blob · Resend · Vitest + Playwright · Vercel.

## Rodando localmente

Requisitos: Node.js 24 e um banco Postgres.

```bash
npm install                 # também gera o Prisma Client
cp .env.example .env.local  # preencha os valores
npx prisma migrate deploy   # aplica as migrations
npm run db:seed             # permissões, papéis (Admin, Professor) e planos iniciais
npm run dev
```

Papéis são atribuídos pelo admin, em **Usuários**. O seed concede `plan`, `subscription` e `coupon.manage` ao papel Admin e `teacherList.manage` ao papel Professor, sem revogar permissões existentes.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) |
| `npm run db:seed` | Seed de permissões, papéis e planos (os planos só se a tabela estiver vazia) |

## Testes

- **Unitários:** `npm test`. Inclui `tests/unit/route-coverage.test.ts`, que falha se alguma rota de API não passar por `defineRoute` ou se surgir rota pública fora da lista revisada.
- **Ponta a ponta:** exigem um banco **descartável** em `E2E_DATABASE_URL`; o preparo aplica as migrations, roda o seed e recria os dados de teste antes de subir o app. Sem Docker, use o banco local do Prisma:

  ```bash
  npx prisma dev --name proximo-test --detach
  E2E_DATABASE_URL="postgres://postgres:postgres@localhost:51218/template1?sslmode=disable" npm run test:e2e
  ```

  No CI, o e2e roda contra um Postgres 17 em service container (`.github/workflows/ci.yml`).

## Segurança

- Toda rota de API é criada com `defineRoute` (`src/server/auth/define-route.ts`): o padrão é fechado, e rotas públicas são declaradas como `"public"`.
- Dados do usuário são sempre filtrados pelo id da sessão verificada.
- `src/proxy.ts` redireciona visitantes sem sessão para o login, mas a checagem real fica em cada página e rota.
- O webhook do Stripe valida a assinatura e é idempotente.
- Login, cadastro e recuperação de senha têm rate limit por IP, guardado no banco.

## Planos e limites

Planos são dados, não código: nome, público (aluno, professor, escola), preços, Price IDs do Stripe, limites e plano padrão são editados em **Admin → Planos**, e nenhum trecho do código depende de um plano específico.

- **Limites:** colunas do plano (questões por dia, redações por mês, listas por mês). Vazio = ilimitado; 0 = não incluso. São aplicados no servidor por `src/server/limits.ts`, com um contador por usuário e período no horário de Brasília.
- **Plano de cada usuário:** o da assinatura ativa daquele público; sem ela, o plano marcado como padrão do público.
- **Venda:** um preço só aparece para compra depois de ter o Price ID do Stripe. O webhook identifica o plano pelo preço pago, então renomear ou reorganizar planos não quebra assinaturas.
- **Novo tipo de limite:** este, sim, exige código: uma coluna no `Plan` e a chamada a `consumeUsage` no ponto em que a ação acontece.

## Arquivos (Vercel Blob)

Imagens de questão ficam num store **público** do Vercel Blob (o modo de acesso não muda depois de criado). O upload vai direto do navegador, com token emitido por `/api/upload`. O banco e o markdown guardam só o caminho (`storage:questions/...`); a URL é montada em `src/lib/blob.ts`.

## Estrutura

```
src/app/        páginas e rotas de API (rotas finas)
src/server/     regras de negócio e autorização
src/lib/        clientes (Prisma, auth, Stripe, Blob, e-mail) e utilitários
prisma/         schema, migrations e seed
tests/          testes unitários e e2e
```
