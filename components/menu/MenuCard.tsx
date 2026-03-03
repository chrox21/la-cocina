'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SwapDialog } from './SwapDialog';
import { ServingsDialog } from './ServingsDialog';
import { MenuItem, useMenuStore } from '@/store/menu-store';

interface MenuCardProps {
  item: MenuItem;
  menuId?: string;
}

const itemTypeIcons: Record<string, string> = {
  main: '🥘',
  side: '🥗',
  breakfast: '🍳',
  drink: '🥤',
};

const itemTypeLabels: Record<string, string> = {
  main: 'Main',
  side: 'Side',
  breakfast: 'Breakfast',
  drink: 'Drink',
};

export function MenuCard({ item, menuId }: MenuCardProps) {
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapAlternatives, setSwapAlternatives] = useState<MenuItem[]>([]);
  const [showServingsDialog, setShowServingsDialog] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const { updateMenuItem, setCurrentMenu, currentMenu, recipeStates, setRecipeState } = useMenuStore();
  const displayServings = item.user_servings_override || item.servings;

  // Get recipe state for this item
  const recipeState = item.id ? recipeStates[item.id] : undefined;
  const isGeneratingRecipe = recipeState?.status === 'generating';
  const isApproved = recipeState?.status === 'approved';
  const hasError = recipeState?.status === 'error';
  const recipeId = recipeState?.recipeId;

  const handleSwap = async () => {
    if (!menuId || !item.id) return;
    setIsSwapping(true);

    try {
      const response = await fetch('/api/menu/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId,
          itemId: item.id,
          pairingGroup: item.pairing_group,
          currentMenu
        })
      });

      const data = await response.json();

      if (data.success) {
        setSwapAlternatives(data.alternatives);
        setShowSwapDialog(true);
      } else {
        console.error('[MenuCard] Swap failed:', data.error);
      }
    } catch (error) {
      console.error('[MenuCard] Error fetching swap alternatives:', error);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSelectAlternative = (alternative: MenuItem) => {
    if (!currentMenu || !item.id) return;

    // Update the item in the current menu, preserving id, sort_order, and pairing_group from original
    const updatedItems = currentMenu.items.map((i) =>
      i.id === item.id
        ? { ...alternative, id: item.id, sort_order: item.sort_order, pairing_group: item.pairing_group }
        : i
    );

    // Recalculate total prep time and time warning
    const totalPrepTime = updatedItems.reduce(
      (sum, i) => sum + (i.prep_time_minutes || 0),
      0
    );

    setCurrentMenu({
      ...currentMenu,
      items: updatedItems,
      total_prep_time_minutes: totalPrepTime,
      time_warning: totalPrepTime > 240,
    });

    setShowSwapDialog(false);
  };

  const handleServingsChange = () => {
    setShowServingsDialog(true);
  };

  const handleConfirmServings = (newServings: number) => {
    if (item.id) {
      updateMenuItem(item.id, { user_servings_override: newServings });
    }
    setShowServingsDialog(false);
  };

  const handleApprove = async () => {
    if (!item.id) return;

    // Capture the exact serving size at the moment of approval
    const approvedServings = displayServings;

    // Set generating state
    setRecipeState(item.id, { status: 'generating' });

    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: item.id,
          nameEn: item.name_en,
          nameEs: item.name_es,
          cuisine: item.cuisine,
          itemType: item.item_type,
          description: item.description,
          servings: approvedServings,
        }),
      });

      const data = await response.json();

      if (data.success && data.recipe?.id) {
        setRecipeState(item.id, { status: 'approved', recipeId: data.recipe.id });
      } else {
        console.error('[MenuCard] Recipe generation failed:', data.error);
        setRecipeState(item.id, {
          status: 'error',
          errorMessage: data.error || 'Recipe generation failed. Try again.',
        });
      }
    } catch (error) {
      console.error('[MenuCard] Error generating recipe:', error);
      setRecipeState(item.id, {
        status: 'error',
        errorMessage: 'Network error — check your connection and try again.',
      });
    }
  };

  const handleViewRecipe = () => {
    if (recipeId) {
      window.open(`/recipe/${recipeId}`, '_blank');
    }
  };

  // Card border changes based on state
  const cardBorderClass = isApproved
    ? 'border-[#3D6B22]'
    : hasError
      ? 'border-red-400'
      : isGeneratingRecipe
        ? 'border-[#8B6D47]'
        : 'border-[#E8E0D4]';

  return (
    <>
      <Card className={`bg-[#FFFDF8] ${cardBorderClass} rounded-xl p-5 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md relative`}>
        {/* Generating overlay */}
        {isGeneratingRecipe && (
          <div className="absolute inset-0 bg-[#FFFDF8]/60 rounded-xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#3D6B22] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-sans font-medium text-[#5C5145]">Generating recipe...</span>
            </div>
          </div>
        )}

        {/* Approved indicator */}
        {isApproved && (
          <div className="absolute top-3 right-3">
            <span className="text-lg" title="Recipe approved">✅</span>
          </div>
        )}

        {/* Error indicator */}
        {hasError && (
          <div className="absolute top-3 right-3">
            <span className="text-lg" title="Recipe generation failed">⚠️</span>
          </div>
        )}

        {/* Type Icon + Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{itemTypeIcons[item.item_type]}</span>
        <span className="text-xs font-sans font-medium text-[#5C5145] uppercase tracking-wider">
          {itemTypeLabels[item.item_type]}
        </span>
      </div>

      {/* Cuisine Badge */}
      <Badge
        variant="outline"
        className="mb-3 bg-[#F5F0E8] text-[#A0937D] border-[#E8E0D4] text-xs font-sans uppercase tracking-wide"
      >
        {item.cuisine}
      </Badge>

      {/* Dish Names */}
      <h3 className="text-[17px] font-serif font-bold text-[#2B2B2B] mb-1 leading-tight">
        {item.name_en}
      </h3>
      <p className="text-[15px] font-serif italic text-[#8B6D47] mb-3">
        {item.name_es}
      </p>

      {/* Description */}
      <p className="text-[13.5px] font-sans text-[#5C5145] mb-4 leading-relaxed">
        {item.description}
      </p>

      {/* Time + Servings Info */}
      <div className="flex items-center gap-4 text-xs font-sans text-[#5C5145] mb-4">
        <div className="flex items-center gap-1.5">
          <span>⏱</span>
          <span>{item.prep_time_minutes} min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🍽</span>
          <span>{displayServings} servings</span>
        </div>
      </div>

        {/* Error message */}
        {hasError && recipeState?.errorMessage && (
          <p className="text-xs font-sans text-red-600 mb-3">
            {recipeState.errorMessage}
          </p>
        )}

        {/* Action Buttons — change based on card state */}
        <div className="flex gap-2">
          {isApproved ? (
            /* State 3: Approved — View Recipe button */
            <Button
              size="sm"
              onClick={handleViewRecipe}
              className="flex-1 text-xs font-sans font-medium text-[#FFFDF8]"
              style={{ background: 'linear-gradient(135deg, #2D5016, #3D6B22)' }}
            >
              View Recipe
            </Button>
          ) : hasError ? (
            /* State 4: Error — Retry button */
            <Button
              size="sm"
              onClick={handleApprove}
              className="flex-1 text-xs font-sans font-medium text-[#FFFDF8] bg-red-500 hover:bg-red-600"
            >
              Retry
            </Button>
          ) : (
            /* State 1: Unapproved — Swap, Servings, Approve */
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwap}
                disabled={isSwapping || isGeneratingRecipe}
                className="flex-1 text-xs font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
              >
                {isSwapping ? 'Loading...' : 'Swap'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleServingsChange}
                disabled={isGeneratingRecipe}
                className="flex-1 text-xs font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
              >
                Servings
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isGeneratingRecipe}
                className="flex-1 text-xs font-sans font-medium text-[#FFFDF8]"
                style={{
                  background: isGeneratingRecipe ? '#A0937D' : 'linear-gradient(135deg, #2D5016, #3D6B22)',
                }}
              >
                Approve
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Swap Dialog */}
      <SwapDialog
        open={showSwapDialog}
        alternatives={swapAlternatives}
        currentItemName={item.name_en}
        onSelect={handleSelectAlternative}
        onCancel={() => setShowSwapDialog(false)}
      />

      {/* Servings Dialog */}
      <ServingsDialog
        open={showServingsDialog}
        currentServings={displayServings}
        itemName={item.name_en}
        onConfirm={handleConfirmServings}
        onCancel={() => setShowServingsDialog(false)}
      />
    </>
  );
}
