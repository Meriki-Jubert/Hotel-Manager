import { en, TranslationKey } from './en';
import { fr } from './fr';

export type Language = 'en' | 'fr';

const dictionaries: Record<Language, Record<string, string>> = {
  en,
  fr
};

/**
 * Pure translation function.
 * Falls back to English if a key is missing in the chosen language.
 * Replaces every {placeholder} from vars.
 */
export function translate(
  lang: Language,
  key: TranslationKey | string,
  vars?: Record<string, string | number>
): string {
  const dict = dictionaries[lang] || dictionaries.en;
  let text = dict[key] ?? dictionaries.en[key] ?? key;

  if (vars && typeof vars === 'object') {
    for (const [varName, varVal] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${varName}\\}`, 'g'), String(varVal));
    }
  }

  return text;
}
