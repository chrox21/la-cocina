import { Badge } from '@/components/ui/badge';

interface TimeBudgetProps {
  totalMinutes: number;
  timeWarning: boolean;
}

export function TimeBudget({ totalMinutes, timeWarning }: TimeBudgetProps) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="mb-6 p-4 bg-[#FFFDF8] border border-[#E8E0D4] rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-sans font-medium text-[#2B2B2B] mb-1">
            Total Cook Time
          </h3>
          <p className="text-2xl font-serif font-bold text-[#2B2B2B]">
            {timeDisplay}
          </p>
        </div>

        {timeWarning ? (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 text-xs font-sans">
            Over 4hr window
          </Badge>
        ) : (
          <Badge
            className="px-3 py-1 text-xs font-sans"
            style={{
              background: 'linear-gradient(135deg, #2D5016, #3D6B22)',
              color: '#FFFDF8',
              border: 'none',
            }}
          >
            Fits in 4hr window ✓
          </Badge>
        )}
      </div>
    </div>
  );
}
