// Shared questionnaire definitions + label lookups.
// Used by the public questionnaire form and the admin/instructor responses viewer.

export type QuestionnaireLang = 'en' | 'lv';

export interface QuestionnaireOption { value: string; en: string; lv: string; }
export interface QuestionnaireQuestion { key: string; en: string; lv: string; options: QuestionnaireOption[]; }

export const QUESTIONNAIRE_QUESTIONS: QuestionnaireQuestion[] = [
  {
    key: 'stage', en: 'Which sounds most like you right now?', lv: 'Kas šobrīd vislabāk raksturo tevi?',
    options: [
      { value: 'idea', en: 'Just an idea', lv: 'Tikai ideja' },
      { value: 'idea_notes', en: 'Idea + some notes', lv: 'Ideja + dažas piezīmes' },
      { value: 'building', en: 'Already trying to build it', lv: 'Jau mēģinu to izveidot' },
      { value: 'live', en: 'Already have something live', lv: 'Man jau kaut kas darbojas' },
    ],
  },
  {
    key: 'has_idea', en: 'Do you already have an idea you want to build?', lv: 'Vai tev jau ir ideja, ko vēlies īstenot?',
    options: [
      { value: 'yes', en: 'Yes, clearly', lv: 'Jā, skaidri' },
      { value: 'rough', en: 'Rough idea', lv: 'Aptuvena ideja' },
      { value: 'exploring', en: 'Not yet, exploring', lv: 'Vēl nē, pētu' },
    ],
  },
  {
    key: 'knows_customer', en: 'Do you know who your customer or user is?', lv: 'Vai zini, kas ir tavs klients vai lietotājs?',
    options: [
      { value: 'yes', en: 'Yes, specific', lv: 'Jā, konkrēti' },
      { value: 'sort_of', en: 'Sort of', lv: 'Daļēji' },
      { value: 'not_yet', en: 'Not yet', lv: 'Vēl nē' },
    ],
  },
  {
    key: 'blocker', en: "What's mainly stopping you from building it right now?", lv: 'Kas galvenokārt tevi kavē to izveidot tagad?',
    options: [
      { value: 'where_to_start', en: "Don't know where to start", lv: 'Nezinu, ar ko sākt' },
      { value: 'no_skills', en: 'No technical skills', lv: 'Nav tehnisko prasmju' },
      { value: 'no_time', en: 'Not enough time', lv: 'Nepietiek laika' },
      { value: 'worth', en: "Not sure it's worth building", lv: 'Neesmu pārliecināts, vai ir vērts' },
    ],
  },
  {
    key: 'preference', en: 'What would help most right now?', lv: 'Kas palīdzētu visvairāk tieši tagad?',
    options: [
      { value: 'details', en: 'See the course details', lv: 'Apskatīt kursa detaļas' },
      { value: 'talk', en: 'Talk it through with someone', lv: 'Pārrunāt ar kādu' },
    ],
  },
];

export function questionLabel(key: string, language: QuestionnaireLang): string {
  const q = QUESTIONNAIRE_QUESTIONS.find(question => question.key === key);
  if (!q) return key;
  return language === 'lv' ? q.lv : q.en;
}

export function answerLabel(key: string, value: string, language: QuestionnaireLang): string {
  const q = QUESTIONNAIRE_QUESTIONS.find(question => question.key === key);
  const option = q?.options.find(o => o.value === value);
  if (!option) return value;
  return language === 'lv' ? option.lv : option.en;
}
