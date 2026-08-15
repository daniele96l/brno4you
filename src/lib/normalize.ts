export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function normalizeDate(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const eu = trimmed.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (eu) return `${eu[3]}-${eu[2]}-${eu[1]}`;
  return normalizeText(trimmed);
}

export function valuesMatch(
  formValue: string | null | undefined,
  idValue: string | null | undefined,
  kind: "text" | "date" = "text",
) {
  if (kind === "date") {
    return normalizeDate(formValue) === normalizeDate(idValue);
  }
  return normalizeText(formValue) === normalizeText(idValue);
}
