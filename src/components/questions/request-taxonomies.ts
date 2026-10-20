// Subjects and skills offered by the question editors.
export async function requestTaxonomies<Subject, Skill>() {
  const [subjectsRes, skillsRes] = await Promise.all([fetch("/api/subject/list"), fetch("/api/skill/list")]);
  if (!subjectsRes.ok || !skillsRes.ok) {
    throw new Error("Erro ao carregar subjects/skills.");
  }
  const subjects = ((await subjectsRes.json()) as Subject[] | null) ?? [];
  const skills = ((await skillsRes.json()) as Skill[] | null) ?? [];
  return { subjects, skills };
}
