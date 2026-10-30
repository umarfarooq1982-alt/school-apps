import { useCallback } from 'react';
import { useShared } from '../store';
import common from './common';
import parent from './parent';
import student from './student';
import teacher from './teacher';

export type Lang = 'en' | 'ur';

const ur: Record<string, string> = {
  ...common,
  ...parent,
  ...student,
  ...teacher,
};

// Keys are the English text itself, so a missing Urdu entry falls back to English.
export function translate(lang: Lang, text: string): string {
  if (lang === 'en') {
    return text;
  }
  return ur[text] ?? text;
}

export function useI18n() {
  const [lang, setLang] = useShared<Lang>('session.lang', 'en');
  const t = useCallback((text: string) => translate(lang, text), [lang]);
  return { lang, setLang, t, isRTL: lang === 'ur' };
}
