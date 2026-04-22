import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import * as XLSX from 'xlsx';
import type { QuizData, Question, ChapterMeta } from './types';

export function parseQuizData(): QuizData {
  const dataDir = resolve(process.cwd(), 'data');
  const files = readdirSync(dataDir)
    .filter(f => /^chapter\d+\.xlsx$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)![0]);
      const nb = parseInt(b.match(/\d+/)![0]);
      return na - nb;
    });

  if (files.length === 0) {
    throw new Error('No chapter*.xlsx files found in data/ directory');
  }

  const chapters: ChapterMeta[] = [];
  const questions: Question[] = [];

  for (const file of files) {
    const filePath = join(dataDir, file);
    const chapterId = parseInt(file.match(/\d+/)![0]);
    const buf = readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });

    const chapterName = (rows[0]?.[3] as string) || `Chapter ${chapterId}`;

    const chapterQuestions: Question[] = [];
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      chapterQuestions.push({
        id: `ch${chapterId}-q${i - 1}`,
        chapterId,
        chapterName,
        question: String(row[0]),
        options: [String(row[1]), String(row[2]), String(row[3]), String(row[4])],
        answer: Number(row[5]),
      });
    }

    chapters.push({
      id: chapterId,
      name: chapterName,
      questionCount: chapterQuestions.length,
    });

    questions.push(...chapterQuestions);
  }

  return { chapters, questions };
}
