import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Macro Guru — Exam Period',
  description: 'Macro Guru is temporarily unavailable during the AP exam period.',
};

function formatExamDate(raw: string): string {
  const month = parseInt(raw.slice(0, 2), 10);
  const day = parseInt(raw.slice(2, 4), 10);
  const year = parseInt(raw.slice(4, 8), 10);

  const date = new Date(year, month - 1, day);
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th';

  return `${weekday}, ${monthName} ${day}${suffix}, ${year}`;
}

export default function ExamPage() {
  const examDate = process.env.EXAM_DATE ?? '';
  const formattedDate = formatExamDate(examDate);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted text-foreground font-sans font-bold text-3xl mb-6">
          M
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Macro Guru</h1>

        <div className="w-12 h-0.5 bg-primary mx-auto mb-8" />

        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          AP Exam Update
        </span>

        <h2 className="text-xl font-semibold text-foreground mb-3">
          AP Macro Exams Have Completed
        </h2>

        <p className="text-muted-foreground mb-8">
          The AP Macroeconomics exams finished on{' '}
          <span className="font-semibold text-foreground">{formattedDate}</span>.
        </p>

        <div className="bg-muted rounded-2xl p-6">
          <p className="text-foreground font-medium mb-2">
            Please check back in the next school year to see if Macro Guru will
            return!
          </p>
          <p className="text-muted-foreground text-sm italic">
            Thank you for your interest in Macro Guru.
          </p>
        </div>

        <p className="text-muted-foreground text-xs mt-8">
          &copy; {new Date().getFullYear()} Macro Guru by Arav Jain
        </p>
      </div>
    </div>
  );
}
