import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ServingsDialogProps {
  open: boolean;
  currentServings: number;
  itemName: string;
  onConfirm: (newServings: number) => void;
  onCancel: () => void;
}

export function ServingsDialog({
  open,
  currentServings,
  itemName,
  onConfirm,
  onCancel
}: ServingsDialogProps) {
  const [servings, setServings] = useState(currentServings);

  // Sync internal state when dialog opens or currentServings changes
  useEffect(() => {
    if (open) {
      setServings(currentServings);
    }
  }, [open, currentServings]);

  const handleConfirm = () => {
    if (servings >= 2 && servings <= 8) {
      onConfirm(servings);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md bg-[#FFFDF8] border-[#E8E0D4]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif font-bold text-[#2B2B2B]">
            Adjust Servings
          </DialogTitle>
          <DialogDescription className="text-sm font-sans text-[#5C5145]">
            {itemName}
          </DialogDescription>
        </DialogHeader>

        {/* Servings Input */}
        <div className="py-6">
          <label className="block text-sm font-sans font-medium text-[#2B2B2B] mb-3">
            Number of Servings
          </label>

          <div className="flex items-center gap-4">
            {/* Decrease Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => setServings(Math.max(2, servings - 1))}
              disabled={servings <= 2}
              className="w-12 h-12 text-xl border-[#E8E0D4] hover:bg-[#F5F0E8]"
            >
              −
            </Button>

            {/* Servings Display */}
            <div className="flex-1 text-center">
              <div className="text-4xl font-serif font-bold text-[#2B2B2B]">
                {servings}
              </div>
              <div className="text-sm font-sans text-[#5C5145] mt-1">
                servings
              </div>
            </div>

            {/* Increase Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => setServings(Math.min(8, servings + 1))}
              disabled={servings >= 8}
              className="w-12 h-12 text-xl border-[#E8E0D4] hover:bg-[#F5F0E8]"
            >
              +
            </Button>
          </div>

          {/* Preview */}
          {servings !== currentServings && (
            <div className="mt-6 p-3 bg-[#F5F0E8] border border-[#E8E0D4] rounded-lg">
              <p className="text-sm font-sans text-[#5C5145] text-center">
                {currentServings} servings → <span className="font-bold text-[#2D5016]">{servings} servings</span>
              </p>
            </div>
          )}

          {/* Range Info */}
          <p className="text-xs font-sans text-[#5C5145] text-center mt-4">
            Min: 2 servings • Max: 8 servings
          </p>
        </div>

        {/* Actions */}
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 text-sm font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={servings === currentServings}
            className="flex-1 text-sm font-sans font-medium"
            style={{
              background: servings !== currentServings
                ? 'linear-gradient(135deg, #2D5016, #3D6B22)'
                : undefined,
              color: '#FFFDF8'
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
