import { expect, test, type APIRequestContext } from "@playwright/test";

import { E2E_OTHER_TEACHER, E2E_TEACHER, E2E_USER } from "./fixtures";
import { signedInContext } from "./helpers";

test.describe("teacher lists", () => {
  let teacher: APIRequestContext;
  let student: APIRequestContext;

  test.beforeAll(async ({}, info) => {
    const baseURL = info.project.use.baseURL!;
    teacher = await signedInContext(baseURL, "10.0.1.1", E2E_TEACHER);
    student = await signedInContext(baseURL, "10.0.1.2", E2E_USER);
  });

  test.afterAll(async () => {
    await teacher?.dispose();
    await student?.dispose();
  });

  test("a teacher downloads the PDF of their own list", async () => {
    const res = await teacher.get(`/api/teacher-lists/${E2E_TEACHER.listId}/pdf?withAnswers=1`);

    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("a teacher only sees their own lists", async () => {
    const lists: { id: string }[] = await (await teacher.get("/api/teacher-lists")).json();
    expect(lists.map((l) => l.id)).toEqual([E2E_TEACHER.listId]);
  });

  test("another teacher's list is not found, including its PDF", async () => {
    const base = `/api/teacher-lists/${E2E_OTHER_TEACHER.listId}`;
    for (const res of [
      await teacher.get(base),
      await teacher.get(`${base}/pdf`),
      await teacher.post(`${base}/duplicate`),
    ]) {
      expect(res.status(), res.url()).toBe(404);
    }
  });

  test("a student without the Professor role cannot use teacher lists", async () => {
    expect((await student.get("/api/teacher-lists")).status()).toBe(403);
  });

  // Runs last: it adds a list. The teacher has no subscription, so the default teacher plan
  // from the seed applies (5 lists per month).
  test("a teacher on the default plan can duplicate a list until the monthly limit", async () => {
    const duplicate = () => teacher.post(`/api/teacher-lists/${E2E_TEACHER.listId}/duplicate`);

    for (let i = 0; i < 5; i++) {
      expect((await duplicate()).status()).toBe(201);
    }
    const blocked = await duplicate();
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).error.message).toContain("limite");
  });
});
