export const E2E_PASSWORD = "senha-e2e-segura-123";

export const E2E_USER = {
  name: "Aluno E2E",
  email: "e2e-aluno@proximovest.test",
  password: E2E_PASSWORD,
};

export const E2E_TEACHER = {
  name: "Professora E2E",
  email: "e2e-professora@proximovest.test",
  password: E2E_PASSWORD,
  listId: "e2e-list-own",
};

export const E2E_OTHER_TEACHER = {
  name: "Outro Professor E2E",
  email: "e2e-outro-professor@proximovest.test",
  password: E2E_PASSWORD,
  listId: "e2e-list-other",
};

export const E2E_ADMIN = {
  name: "Admin E2E",
  email: "e2e-admin@proximovest.test",
  password: E2E_PASSWORD,
  permissions: ["examBoard.manage", "plan.manage"],
};

export const E2E_BOARD_SLUG = "e2e-banca";
// Extra boards so the admin table needs a second page (page size is 10).
export const E2E_EXTRA_BOARDS = 12;
