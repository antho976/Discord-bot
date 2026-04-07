// Template index — mutable template store managed via dashboard
// Broad templates: topic → array of responses
// Focused templates: question → array of possible answers

export const TEMPLATES = {
  gaming: [],
  stream: [],
  music: [],
  movies_tv: [],
  meme: [],
  creative: [],
  horror_scary: [],
  food: [],
  cooking: [],
  sports: [],
  travel: [],
  fashion: [],
  cars: [],
  pets_animals: [],
  weather: [],
  sleep: [],
  home_life: [],
  tech: [],
  social_media: [],
  health: [],
  self_improvement: [],
  school_work: [],
  money: [],
  relationship: [],
  science_space: [],
  mood_positive: [],
  mood_negative: [],
  greeting: [],
  question: [],
  idleon: [],
  fallback: [],
};

// Focused templates: question → multiple possible answers
export const FOCUSED_TEMPLATES = new Map();

// Load templates from saved state
export function loadTemplates(data) {
  if (!data) return;
  if (data.broad) {
    for (const [topic, responses] of Object.entries(data.broad)) {
      if (Array.isArray(responses)) {
        TEMPLATES[topic] = responses;
      }
    }
  }
  if (data.focused) {
    FOCUSED_TEMPLATES.clear();
    for (const [question, answers] of Object.entries(data.focused)) {
      if (Array.isArray(answers)) {
        FOCUSED_TEMPLATES.set(question, answers);
      }
    }
  }
}

// Save templates to state
export function templatesToJSON() {
  const broad = {};
  for (const [key, val] of Object.entries(TEMPLATES)) {
    if (Array.isArray(val) && val.length > 0) {
      broad[key] = val;
    }
  }
  const focused = {};
  for (const [q, a] of FOCUSED_TEMPLATES) {
    focused[q] = a;
  }
  return { broad, focused };
}
