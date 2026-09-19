// Common Hungarian function/question words, lowercase, no accents required
// (accented and unaccented forms both listed since speech recognizers often
// drop diacritics). Used only to pick which language to hint the browser's
// speech recognizer with for the next segment - the LLM does the real,
// authoritative language/intent classification server-side.
const HUNGARIAN_WORDS = new Set([
  "hogy",
  "hogyan",
  "nem",
  "igen",
  "mit",
  "mi",
  "miert",
  "miért",
  "mikor",
  "hol",
  "mert",
  "es",
  "és",
  "vagy",
  "angolul",
  "magyarul",
  "kerlek",
  "kérlek",
  "kerem",
  "kérem",
  "ertem",
  "értem",
  "lassabban",
  "jelent",
  "tudom",
  "vagyok",
  "van",
  "mondani",
  "mondd",
  "kell",
  "ez",
  "az",
  "sajnos",
  "koszonom",
  "köszönöm",
  "elnezest",
  "elnézést",
]);

const HUNGARIAN_ACCENTED_CHARS = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;

const HUNGARIAN_WORD_RATIO_THRESHOLD = 0.3;

/**
 * A cheap heuristic guess at whether a transcript segment is Hungarian
 * rather than English - accented characters are a strong signal, otherwise
 * falls back to counting recognizable Hungarian function words. Defaults to
 * false (English) when there's not enough signal either way.
 */
export function looksHungarian(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (HUNGARIAN_ACCENTED_CHARS.test(trimmed)) return true;

  const words = trimmed.toLowerCase().match(/[a-záéíóöőúüű]+/g) ?? [];
  if (words.length === 0) return false;

  const hungarianHits = words.filter((w) => HUNGARIAN_WORDS.has(w)).length;
  return hungarianHits / words.length >= HUNGARIAN_WORD_RATIO_THRESHOLD;
}
