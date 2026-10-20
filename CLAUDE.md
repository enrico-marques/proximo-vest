Próximo Vest V2

Plataforma de questões de vestibular (ENEM, Fuvest, Unicamp e outras bancas) para aluno, professor e, mais adiante, escola. O banco de questões é curado por admins; o aluno pratica e acompanha desempenho; o professor monta listas, atribui a turmas e imprime PDF; a IA corrige redação e comenta resoluções.

A V1 foi construída em 2025 a partir de um template de dashboard (Studio Admin) e parou na metade. A V2 reescreve a camada de aplicação e mantém o modelo de dados do catálogo. Não é uma reescrita do zero: o schema de provas/questões é o melhor ativo do projeto.

Estado da V1 (não confie nela)
Autorização não protege: cerca de 45 rotas chamam requireAPIAuth sem tratar o retorno (a função devolve uma resposta de erro em vez de lançar). Sem sessão, session fica indefinido e filtros do Prisma com undefined são ignorados, então listas de professor e PDFs podem vazar.
Rotas sem nenhuma autenticação: importação em lote de questões, upload, busca de questões do professor, listagens públicas.
src/proxy.disabled.ts está desligado.
Dashboards de aluno e professor são mock (nome e dados fixos), renderizados na mesma página.
Não existe modelo de tentativa/resposta do aluno, nem turmas, nem simulados.
Redação e IA estão nos planos, mas não existem no código.
Planos têm três fontes de verdade conflitantes (STUDENT_PREMIUM/ELITE, STUDENT_START/PRO, TEACHER_EDU) e os limites só são exibidos, nunca aplicados.
Sobras do template: CRM, Finance, dashboard/default copy, landing em inglês, app-config, README padrão, sem testes, sem .env.example, ~119 usos de any.
Stack (fechada: não trocar sem pedir)
Next.js (App Router) + React, um app só. Sem backend separado, sem monorepo.
TypeScript estrito. Evitar any; tipar com Zod/Prisma.
Postgres no Prisma Postgres + Prisma ORM. Seguir a documentação atual do Prisma para o client e o adapter.
Autenticação: better-auth (e-mail/senha, Google, verificação de e-mail).
UI: Tailwind CSS + shadcn/ui. Sem o template antigo.
Validação: Zod em toda borda (rotas, server actions, formulários).
Pagamentos: Stripe (avaliar Pix/boleto depois).
Arquivos: Vercel Blob (substitui o Cloudflare R2). Ver seção própria.
E-mail: Resend.
IA: API da Anthropic, somente no servidor.
Fila/jobs para correção de redação: Inngest ou Trigger.dev (decidir na fase de IA).
Fórmulas: KaTeX desde o início (vestibular tem muita matemática, física e química).
PDF: gerar a partir de HTML (com suporte a fórmula e imagem), não desenhando à mão.
Testes: Vitest + Playwright. Erros em produção: Sentry.
Hospedagem: Vercel.
Dependências: sempre nas versões mais recentes. Atualizar em commit separado, ler o guia de migração de cada major e rodar build, lint e testes antes de seguir.
Estrutura alvo
src/app/
  (public)/    landing, páginas públicas de questões (SEO), planos
  (auth)/      login, cadastro, recuperação
  (student)/   área do aluno (mobile-first)
  (teacher)/   área do professor
  (admin)/     curadoria, usuários, planos, cupons
  api/         só o que precisa ser HTTP (webhooks, upload, endpoints públicos)
src/server/    serviços de domínio (questões, listas, assinaturas, limites, IA)
src/lib/       prisma, auth, stripe, blob, mail, utilitários
prisma/        schema, migrations, seeds

Lógica de negócio fica em src/server/, não dentro de rotas nem de componentes.

Segurança e autorização (inegociável)
Toda rota de API e toda server action passa por um único wrapper de autorização. É proibido chamar um guard e ignorar o retorno.
Rotas públicas são declaradas explicitamente como públicas. O padrão é fechado.
Todo acesso a dado do usuário filtra por userId vindo da sessão verificada. Nunca usar undefined em filtro do Prisma.
Existe um teste que percorre todos os arquivos de rota e falha se alguma não estiver protegida nem marcada como pública.
Upload exige autenticação, permissão, tipo de arquivo e tamanho máximo.
Reativar o proxy.ts do Next 16 para proteger páginas por sessão, mas sem confiar só nele: a checagem real fica na rota/serviço.
Webhooks (Stripe) validam assinatura e são idempotentes.
Segredos só em variáveis de ambiente. Manter .env.example atualizado. Conferir se algum segredo foi commitado no histórico.
Rate limit em login, cadastro, recuperação de senha, upload e endpoints de IA.
Dados
Manter a cadeia Banca → Edição → Fase → Questão, estímulo compartilhado, MCQ e discursiva com rubrica, disciplinas e habilidades.
Novos modelos previstos: tentativa/resposta do aluno, turma e matrícula, tarefa (lista atribuída a turma com prazo), correção de redação, contador de uso mensal por usuário.
Questão só aparece para alunos e professores quando PUBLISHED.
Dificuldade futura: calibrar pelo índice real de acerto, não só por rótulo manual.
Consultas enxutas: o Prisma Postgres cobra por operação. Evitar N+1 e várias buscas por requisição.
Busca: começar com full-text do Postgres, com paginação real.
Armazenamento (Vercel Blob)
Substituir @better-upload/*, uploadthing e @uploadthing/react por @vercel/blob. Remover o que não for usado.
Upload do cliente via rota de token autenticada, com restrição de tipo e tamanho (hoje 10 MB para imagens).
Guardar no banco apenas a chave/pathname (storageKey) e montar a URL em um único lugar (src/lib/blob.ts). Isso mantém a troca de provedor fácil no futuro.
Verificar na documentação atual da Vercel se imagens de questão devem ser públicas ou privadas e aplicar o que for adequado.
Atualizar todos os pontos que usam imagem: editor de markdown, estímulos, PDF, StimulusAsset.
Planos e limites
Uma única fonte de verdade: a tabela Plan no banco. Remover enums e constantes duplicados.
Limites (listas por mês, créditos de redação, questões por dia no free) aplicados no servidor, com contador mensal. A tela de assinatura só exibe.
Status da assinatura tipado de ponta a ponta, incluindo cancelamento ao fim do período.
Plano de escola fica fora da primeira versão, mas a modelagem não deve impedi-lo (organização, assentos).
Convenções
Textos da interface em pt-BR. Identificadores de código e mensagens de commit em inglês.
Server Components por padrão. "use client" só quando necessário.
Server actions ou serviços chamados por rotas finas. Sem lógica duplicada entre rota e componente.
Componentes pequenos, nomeados pelo domínio (QuestionCard, não Card2).
Sem comentários óbvios. Comentar o porquê, não o quê.
Acessibilidade e mobile-first na área do aluno.
Fórmulas em LaTeX renderizadas com KaTeX no site e no PDF.
Comandos

Usar os scripts do package.json (dev, build, lint). Criar test (Vitest) e test:e2e (Playwright) na Fase 0. Antes de concluir qualquer tarefa: lint, build e testes passando.

Roadmap
Fase	Foco
0	Segurança, remoção do template, troca R2 → Blob, atualização de dependências, planos unificados, testes base
1	Núcleo do aluno: responder questões, resolução comentada, caderno de erros, estatísticas, dashboards com dados reais
2	Professor: turmas com convite, tarefas com prazo, correção automática, relatórios por turma e questão, PDF melhor
3	IA: correção de redação por competência, resoluções comentadas, classificação na importação de questões
4	Plano de escola, páginas públicas para SEO, PWA
Como trabalhar
Começar em modo de planejamento e apresentar o plano antes de editar.
Branch v2. A V1 permanece na main como referência até a V2 cobrir o que importa.
Mudanças pequenas e revisáveis: um tema por commit.
Perguntar antes de ações destrutivas: apagar tabela ou migration, alterar schema em produção, remover dependência com uso incerto.
Ao achar bug ou risco de segurança fora do escopo da tarefa, registrar em uma lista e avisar, sem consertar escondido.
Não inventar requisitos. Se faltar decisão de produto, perguntar.