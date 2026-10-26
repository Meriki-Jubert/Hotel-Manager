import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return Array.from(new Set(matches)).sort();
}

function checkI18n(): void {
  const problems: string[] = [];

  const enKeys = Object.keys(en);
  const frKeys = Object.keys(fr);
  const allKeys = Array.from(new Set([...enKeys, ...frKeys]));

  const enKeySet = new Set(enKeys);
  const frKeySet = new Set(frKeys);

  for (const key of allKeys) {
    const hasEn = enKeySet.has(key);
    const hasFr = frKeySet.has(key);

    if (!hasEn) {
      problems.push(`Missing key in English (en.ts): '${key}'`);
      continue;
    }

    if (!hasFr) {
      problems.push(`Missing key in French (fr.ts): '${key}'`);
      continue;
    }

    const enVal = (en as Record<string, string>)[key];
    const frVal = (fr as Record<string, string>)[key];

    if (typeof enVal !== 'string' || enVal.trim() === '') {
      problems.push(`Empty value in English (en.ts) for key: '${key}'`);
    }

    if (typeof frVal !== 'string' || frVal.trim() === '') {
      problems.push(`Empty value in French (fr.ts) for key: '${key}'`);
    }

    if (typeof enVal === 'string' && typeof frVal === 'string') {
      const enPlaceholders = extractPlaceholders(enVal);
      const frPlaceholders = extractPlaceholders(frVal);

      if (JSON.stringify(enPlaceholders) !== JSON.stringify(frPlaceholders)) {
        problems.push(
          `Placeholder mismatch for key '${key}': EN has [${enPlaceholders.join(', ')}], FR has [${frPlaceholders.join(', ')}]`
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error(`\n❌ Found ${problems.length} i18n issue(s):\n`);
    for (const p of problems) {
      console.error(`  - ${p}`);
    }
    console.error('\nPlease fix the issues above before committing.\n');
    process.exit(1);
  } else {
    console.log(`\n✅ i18n check passed: All ${allKeys.length} keys match between English and French with identical placeholders!\n`);
    process.exit(0);
  }
}

checkI18n();
