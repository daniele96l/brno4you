/** Normalize for case/diacritic-insensitive text compare (names, doc numbers, etc.). */
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

/**
 * Each entry: aliases that all mean the same country (ISO codes, English/local
 * names, demonyms). Used so "italian" matches "ITA" / "IT" / "Italy".
 */
const COUNTRY_ALIAS_GROUPS: string[][] = [
  ["IT", "ITA", "Italy", "Italia", "Italian", "Italiano", "Italiana"],
  ["CZ", "CZE", "Czechia", "Czech Republic", "Cesko", "Česko", "Czech", "Ceska"],
  ["PL", "POL", "Poland", "Polska", "Polish", "Polski", "Polska"],
  ["ES", "ESP", "Spain", "Espana", "España", "Spanish", "Espanol", "Español"],
  ["PT", "PRT", "Portugal", "Portuguese", "Portugues", "Português"],
  ["FR", "FRA", "France", "French", "Francais", "Français"],
  ["DE", "DEU", "Germany", "Deutschland", "German", "Deutsch"],
  ["AT", "AUT", "Austria", "Osterreich", "Österreich", "Austrian"],
  ["SK", "SVK", "Slovakia", "Slovensko", "Slovak"],
  ["HU", "HUN", "Hungary", "Magyarorszag", "Magyarország", "Hungarian", "Magyar"],
  ["RO", "ROU", "Romania", "România", "Romanian", "Romana"],
  ["BG", "BGR", "Bulgaria", "Bulgarian"],
  ["HR", "HRV", "Croatia", "Hrvatska", "Croatian"],
  ["SI", "SVN", "Slovenia", "Slovenija", "Slovenian"],
  ["GR", "GRC", "Greece", "Hellas", "Ellada", "Greek", "Elliniki"],
  ["NL", "NLD", "Netherlands", "Holland", "Dutch", "Nederlands"],
  ["BE", "BEL", "Belgium", "Belgie", "Belgique", "Belgian"],
  ["IE", "IRL", "Ireland", "Eire", "Éire", "Irish"],
  ["SE", "SWE", "Sweden", "Sverige", "Swedish"],
  ["FI", "FIN", "Finland", "Suomi", "Finnish"],
  ["DK", "DNK", "Denmark", "Danmark", "Danish"],
  ["LT", "LTU", "Lithuania", "Lietuva", "Lithuanian"],
  ["LV", "LVA", "Latvia", "Latvija", "Latvian"],
  ["EE", "EST", "Estonia", "Eesti", "Estonian"],
  ["CY", "CYP", "Cyprus", "Kypros", "Cypriot"],
  ["MT", "MLT", "Malta", "Maltese"],
  ["LU", "LUX", "Luxembourg", "Luxembourgeois"],
  ["UA", "UKR", "Ukraine", "Ukrainian"],
  ["TR", "TUR", "Turkey", "Turkiye", "Türkiye", "Turkish"],
  ["GB", "GBR", "UK", "United Kingdom", "Britain", "British", "England", "English"],
  ["US", "USA", "United States", "America", "American"],
];

const COUNTRY_CANON = new Map<string, string>();
for (let i = 0; i < COUNTRY_ALIAS_GROUPS.length; i++) {
  const key = `c${i}`;
  for (const alias of COUNTRY_ALIAS_GROUPS[i]) {
    COUNTRY_CANON.set(normalizeText(alias), key);
  }
}

/** True if both values refer to the same country (code, name, or demonym). */
export function countriesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ca = COUNTRY_CANON.get(na);
  const cb = COUNTRY_CANON.get(nb);
  if (ca && cb && ca === cb) return true;
  // One side is a known alias and the other is a prefix/contains match of another alias in group
  if (ca && cb) return ca === cb;
  return false;
}

export function valuesMatch(
  formValue: string | null | undefined,
  idValue: string | null | undefined,
  kind: "text" | "date" | "country" = "text",
) {
  if (kind === "date") {
    return normalizeDate(formValue) === normalizeDate(idValue);
  }
  if (kind === "country") {
    return countriesMatch(formValue, idValue);
  }
  return normalizeText(formValue) === normalizeText(idValue);
}
