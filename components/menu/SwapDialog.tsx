import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MenuItem } from '@/store/menu-store';

interface SwapDialogProps {
  open: boolean;
  alternatives: MenuItem[];
  currentItemName: string;
  onSelect: (item: MenuItem) => void;
  onCancel: () => void;
}

export function SwapDialog({
  open,
  alternatives,
  currentItemName,
  onSelect,
  onCancel
}: SwapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#FFFDF8] border-[#E8E0D4]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif font-bold text-[#2B2B2B]">
            Swap &ldquo;{currentItemName}&rdquo;
          </DialogTitle>
          <DialogDescription className="text-sm font-sans text-[#5C5145]">
            Select an alternative from the options below
          </DialogDescription>
        </DialogHeader>

        {/* Alternatives List */}
        <div className="space-y-3 mt-4">
          {alternatives.map((alt, index) => (
            <button
              key={index}
              onClick={() => onSelect(alt)}
              className="w-full text-left p-4 bg-white border border-[#E8E0D4] rounded-lg hover:border-[#2D5016] hover:bg-[#F5F0E8] transition-colors"
            >
              {/* Cuisine Badge */}
              <Badge
                variant="outline"
                className="mb-2 bg-[#F5F0E8] text-[#A0937D] border-[#E8E0D4] text-xs font-sans uppercase"
              >
                {alt.cuisine}
              </Badge>

              {/* Names */}
              <h4 className="text-base font-serif font-bold text-[#2B2B2B] mb-1">
                {alt.name_en}
              </h4>
              <p className="text-sm font-serif italic text-[#8B6D47] mb-2">
                {alt.name_es}
              </p>

              {/* Description */}
              <p className="text-sm font-sans text-[#5C5145] mb-3">
                {alt.description}
              </p>

              {/* Time + Servings */}
              <div className="flex items-center gap-4 text-xs font-sans text-[#5C5145]">
                <span>⏱ {alt.prep_time_minutes} min</span>
                <span>🍽 {alt.servings} servings</span>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            className="text-sm font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
