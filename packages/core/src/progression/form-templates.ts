export interface FormTemplate {
  id: string;
  name: string;
  numerals: string[];
  description: string;
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "ii-V-I",
    name: "ii-V-I",
    numerals: ["ii7", "V7", "Imaj7"],
    description: "The most common jazz cadence",
  },
  {
    id: "minor-ii-V-i",
    name: "Minor ii-V-i",
    numerals: ["iiø7", "V7", "i7"],
    description: "Minor key ii-V-i cadence",
  },
  {
    id: "I-vi-ii-V",
    name: "I-vi-ii-V",
    numerals: ["Imaj7", "vi7", "ii7", "V7"],
    description: "Classic turnaround (rhythm changes A section)",
  },
  {
    id: "iii-vi-ii-V",
    name: "iii-vi-ii-V",
    numerals: ["iii7", "vi7", "ii7", "V7"],
    description: "Extended turnaround from the iii chord",
  },
  {
    id: "blues",
    name: "12-Bar Blues",
    numerals: [
      "I7", "IV7", "I7", "I7",
      "IV7", "IV7", "I7", "I7",
      "V7", "IV7", "I7", "V7",
    ],
    description: "Standard 12-bar blues progression",
  },
  {
    id: "jazz-blues",
    name: "Jazz Blues",
    numerals: [
      "I7", "IV7", "I7", "vi7",
      "ii7", "V7", "I7", "vi7",
      "ii7", "V7", "I7", "ii7", "V7",
    ],
    description: "Jazz blues with ii-V turnarounds",
  },
  {
    id: "rhythm-changes",
    name: "Rhythm Changes (A)",
    numerals: ["Imaj7", "vi7", "ii7", "V7", "iii7", "vi7", "ii7", "V7"],
    description: "A section of rhythm changes (I Got Rhythm)",
  },
  {
    id: "modal-vamp",
    name: "Modal Vamp",
    numerals: ["i7", "bVII7"],
    description: "Two-chord modal vamp (So What / Impressions style)",
  },
  {
    id: "backdoor-ii-V",
    name: "Backdoor ii-V",
    numerals: ["iv7", "bVII7", "Imaj7"],
    description: "Backdoor resolution via bVII to I",
  },
  {
    id: "tritone-sub",
    name: "Tritone Sub ii-V-I",
    numerals: ["ii7", "bII7", "Imaj7"],
    description: "ii-V-I with tritone substitution on the V",
  },
];

// Keyword aliases for template lookup
const TEMPLATE_ALIASES: Record<string, string> = {
  "blues": "blues",
  "jazzblues": "jazz-blues",
  "rhythmchanges": "rhythm-changes",
  "rhythmchange": "rhythm-changes",
  "turnaround": "I-vi-ii-V",
  "modalvamp": "modal-vamp",
  "backdoor": "backdoor-ii-V",
  "tritonesub": "tritone-sub",
  "tritonesubstitution": "tritone-sub",
  "minoriivi": "minor-ii-V-i",
  "minorii-v-i": "minor-ii-V-i",
};

/**
 * Find a form template by ID, name, or keyword alias.
 */
export function findTemplate(query: string): FormTemplate | undefined {
  const lower = query.toLowerCase().replace(/[\s\-–—]+/g, "");

  // Exact ID match
  const byId = FORM_TEMPLATES.find((t) => t.id.replace(/-/g, "").toLowerCase() === lower);
  if (byId) return byId;

  // Alias match
  const aliasId = TEMPLATE_ALIASES[lower];
  if (aliasId) {
    return FORM_TEMPLATES.find((t) => t.id === aliasId);
  }

  // Fuzzy name match
  return FORM_TEMPLATES.find((t) => {
    const name = t.name.toLowerCase().replace(/[\s\-–—]+/g, "");
    return name.includes(lower) || lower.includes(name);
  });
}
