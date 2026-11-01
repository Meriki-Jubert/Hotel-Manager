import fs from 'fs';
import path from 'path';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return Array.from(new Set(matches)).sort();
}

function getSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getSourceFiles(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

function scanKeysInCode(): Set<string> {
  const foundKeys = new Set<string>();
  const srcDir = path.resolve(process.cwd(), 'src');
  const files = getSourceFiles(srcDir);

  // Regex patterns to capture string literals in fail('...'), notify('...'), errorKey: '...'
  const patterns = [
    /\bfail\s*\(\s*['"]([^'"]+)['"]/g,
    /\bnotify\s*\(\s*['"]([^'"]+)['"]/g,
    /\berrorKey\s*:\s*['"]([^'"]+)['"]/g
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          foundKeys.add(match[1]);
        }
      }
    }
  }

  return foundKeys;
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

  // Safety net: check keys found in fail('...'), notify('...'), errorKey: '...'
  const codeKeys = scanKeysInCode();
  for (const key of Array.from(codeKeys)) {
    if (!enKeySet.has(key)) {
      problems.push(`Key used in code '${key}' missing in English dictionary (en.ts)`);
    }
    if (!frKeySet.has(key)) {
      problems.push(`Key used in code '${key}' missing in French dictionary (fr.ts)`);
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
    console.log(`\n✅ i18n check passed: All ${allKeys.length} keys match between English and French with identical placeholders! (${codeKeys.size} code keys verified)\n`);
    process.exit(0);
  }
}

checkI18n();
