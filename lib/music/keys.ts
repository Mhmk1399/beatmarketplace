const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const MODES = ["major", "minor"] as const;
export type MusicalKey = `${typeof NOTES[number]} ${typeof MODES[number]}`;

const spellings: Record<typeof NOTES[number], readonly string[]> = {
  C: ["C", "B#"], "C#": ["C#", "Db"], D: ["D"], "D#": ["D#", "Eb"],
  E: ["E", "Fb"], F: ["F", "E#"], "F#": ["F#", "Gb"], G: ["G"],
  "G#": ["G#", "Ab"], A: ["A"], "A#": ["A#", "Bb"], B: ["B", "Cb"],
};
const displayNotes: Record<typeof NOTES[number], string> = {
  C: "C", "C#": "C♯ / D♭", D: "D", "D#": "D♯ / E♭", E: "E", F: "F",
  "F#": "F♯ / G♭", G: "G", "G#": "G♯ / A♭", A: "A", "A#": "A♯ / B♭", B: "B",
};

/** The same 24 tonal keys are used by editors, filters, validation and storage. */
export const MUSICAL_KEYS = NOTES.flatMap(note => MODES.map(mode => `${note} ${mode}` as MusicalKey));
export const MUSICAL_KEY_OPTIONS = NOTES.flatMap(note => MODES.map(mode => ({
  value: `${note} ${mode}` as MusicalKey, label: `${displayNotes[note]} ${mode === "major" ? "Major" : "Minor"}`,
})));
export const MUSICAL_KEY_FILTER_OPTIONS = [{ value: "", label: "All musical keys" }, ...MUSICAL_KEY_OPTIONS];

/** Preserve legitimate older flat/sharp spellings while storing one consistent value. */
export function normalizeMusicalKey(value: unknown): MusicalKey | null {
  if (typeof value !== "string") return null;
  const match = /^([a-g])\s*([#b]?)\s*(major|minor|maj|min)$/i.exec(value.trim().replaceAll("♯", "#").replaceAll("♭", "b"));
  if (!match) return null;
  const root = match[1].toUpperCase() + match[2].toLowerCase();
  const note = NOTES.find(note => spellings[note].includes(root));
  return note ? `${note} ${match[3].toLowerCase().startsWith("maj") ? "major" : "minor"}` : null;
}

/** A bounded allowlisted expression also finds old enharmonic spellings; input is never interpolated. */
export function musicalKeySearchPattern(key: MusicalKey) {
  const [note, mode] = key.split(" ") as [typeof NOTES[number], typeof MODES[number]];
  const roots = spellings[note].map(root => root.replace("#", "[#♯]").replace("b", "[b♭]"));
  return `^(?:${roots.join("|")})\\s*(?:${mode === "major" ? "major|maj" : "minor|min"})$`;
}
