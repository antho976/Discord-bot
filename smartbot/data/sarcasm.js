// Sarcasm detection patterns and responses

export const SARCASM_PATTERNS = [
  /oh yeah (?:that|thats|this|its?) (?:totally|definitely|absolutely|clearly|obviously)/i,
  /(?:wow|oh wow) (?:what a|such a|so) (?:surprise|shock|revelation)/i,
  /(?:im|i am) (?:so|totally|absolutely) (?:shocked|surprised|amazed)/i,
  /(?:never|nobody) (?:would have|wouldve|could have|couldve) (?:guessed|thought|imagined|expected)/i,
  /what a (?:time to be alive|wonderful|great|fantastic) (?:world|life|day|time)/i,
  /(?:thanks|thank you) (?:so much|a lot) (?:for nothing|captain obvious|sherlock)/i,
  /(?:real|totally|very) (?:original|unique|creative|innovative|groundbreaking)/i,
];

export const SARCASM_RESPONSES = [
  'the sarcasm is dripping and I am here for it',
  'I could cut the sarcasm with a knife lmao',
  'oh we doing sarcasm? I can match that energy',
  'the passive aggression is immaculate',
  'tell us how you really feel tho',
  'I felt the eye roll through the screen',
  'that was so sarcastic it circled back to sincere',
  'the shade is real and I respect it',
];

export function detectSarcasm(text) {
  if (text.split(/\s+/).length < 4) return false;
  return SARCASM_PATTERNS.some(p => p.test(text));
}
