'use client';

interface TranscriptStatsProps {
  censoredCount: number;
  totalCount: number;
}

export function TranscriptStats({ censoredCount, totalCount }: TranscriptStatsProps) {
  return (
    <div className="font-inter flex items-center gap-2 text-sm text-gray-600">
      <span className="font-semibold">
        {censoredCount} of {totalCount} words selected
      </span>
    </div>
  );
}
