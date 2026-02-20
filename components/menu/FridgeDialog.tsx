'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface FridgeDialogProps {
  open: boolean;
  onClose: () => void;
}

interface FridgeSuggestion {
  name_en: string;
  name_es: string;
  description: string;
  match_percentage: number;
  missing_ingredients: string[];
}

export function FridgeDialog({ open, onClose }: FridgeDialogProps) {
  const [ingredients, setIngredients] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<FridgeSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!ingredients.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const response = await fetch('/api/fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: ingredients.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get suggestions');
      }

      setSuggestions(data.suggestions);
    } catch (err) {
      console.error('Error in fridge mode:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSuggestions([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#FFFDF8] border-[#E8E0D4]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif font-bold text-[#2B2B2B]">
            🥶 Fridge Mode
          </DialogTitle>
          <DialogDescription className="text-sm font-sans text-[#5C5145]">
            Tell me what ingredients you have, and I&apos;ll suggest recipes you can make.
          </DialogDescription>
        </DialogHeader>

        {/* Ingredients Input */}
        <div className="py-4">
          <label className="block text-sm font-sans font-medium text-[#2B2B2B] mb-2">
            What&apos;s in your fridge?
          </label>
          <Textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="e.g., chicken thighs, rice, bell peppers, soy sauce, garlic, ginger, limes..."
            className="min-h-[100px] resize-none text-sm font-sans bg-white border-[#E8E0D4] focus:ring-[#2D5016] focus:border-[#2D5016]"
            disabled={isLoading}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-sans text-red-800">{error}</p>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-sans font-medium text-[#2B2B2B]">
              Here&apos;s what you can make:
            </h4>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 bg-white border border-[#E8E0D4] rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-base font-serif font-bold text-[#2B2B2B]">
                    {suggestion.name_en}
                  </h5>
                  <span className="text-xs font-sans font-medium px-2 py-1 rounded-full bg-[#F5F0E8] text-[#2D5016]">
                    {suggestion.match_percentage}% match
                  </span>
                </div>
                <p className="text-sm font-serif italic text-[#8B6D47] mb-2">
                  {suggestion.name_es}
                </p>
                <p className="text-sm font-sans text-[#5C5145] mb-2">
                  {suggestion.description}
                </p>
                {suggestion.missing_ingredients.length > 0 && (
                  <p className="text-xs font-sans text-[#A0937D]">
                    You&apos;d need: {suggestion.missing_ingredients.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="text-sm font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
          >
            Close
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!ingredients.trim() || isLoading}
            className="text-sm font-sans font-medium"
            style={{
              background: ingredients.trim() && !isLoading
                ? 'linear-gradient(135deg, #2D5016, #3D6B22)'
                : undefined,
              color: '#FFFDF8',
            }}
          >
            {isLoading ? 'Thinking...' : 'Get Suggestions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
