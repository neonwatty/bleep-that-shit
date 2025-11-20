import type { BleepSegment } from '@/lib/types/bleep';
import {
  getBleepStats,
  mergeOverlappingBleeps,
  applyBufferToSegment,
} from '@/lib/utils/bleepMerger';

interface BleepStatsDisplayProps {
  allSegments: BleepSegment[];
  bleepBuffer: number;
}

export function BleepStatsDisplay({ allSegments, bleepBuffer }: BleepStatsDisplayProps) {
  if (allSegments.length === 0) return null;

  // Calculate stats before merging
  const beforeStats = getBleepStats(allSegments);

  // Calculate stats after applying buffer and merging
  const segmentsWithBuffer = allSegments.map(seg => applyBufferToSegment(seg, bleepBuffer));
  const mergedSegments = mergeOverlappingBleeps(segmentsWithBuffer);
  const afterStats = getBleepStats(mergedSegments);

  return (
    <div className="space-y-3">
      {/* Before Merging */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm">
        <div className="mb-2 font-semibold text-purple-900">Segments before merging:</div>
        <div className="space-y-1 text-purple-800">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-pink-400"></div>
            <span>
              {beforeStats.word} word-based bleep{beforeStats.word !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-400"></div>
            <span>
              {beforeStats.manual} manual region{beforeStats.manual !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-1 border-t border-purple-300 pt-1 font-semibold">
            Total: {beforeStats.total} segment{beforeStats.total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* After Merging */}
      {bleepBuffer > 0 || afterStats.merged > 0 ? (
        <div className="rounded-lg border border-purple-300 bg-purple-100 p-3 text-sm">
          <div className="mb-2 font-semibold text-purple-900">
            After merging (with {bleepBuffer}s buffer):
          </div>
          <div className="space-y-1 text-purple-800">
            {afterStats.word > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-pink-400"></div>
                <span>
                  {afterStats.word} word-only segment{afterStats.word !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {afterStats.manual > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                <span>
                  {afterStats.manual} manual-only segment{afterStats.manual !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {afterStats.merged > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                <span>
                  {afterStats.merged} merged segment{afterStats.merged !== 1 ? 's' : ''} (word +
                  manual overlap)
                </span>
              </div>
            )}
            <div className="mt-1 border-t border-purple-400 pt-1 font-semibold">
              Final total: {afterStats.total} segment{afterStats.total !== 1 ? 's' : ''} to apply
            </div>
          </div>

          {beforeStats.total > afterStats.total && (
            <div className="mt-2 rounded bg-purple-200 px-2 py-1 text-xs text-purple-700">
              ℹ️ {beforeStats.total - afterStats.total} segment
              {beforeStats.total - afterStats.total !== 1 ? 's' : ''} merged due to overlaps
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-purple-700">
          No buffer or overlaps - segments will be applied as-is
        </div>
      )}
    </div>
  );
}
