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

  const { updateMenuItem, setCurrentMenu, currentMenu } = useMenuStore();
  const displayServings = item.user_servings_override || item.servings;

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
      }
    } catch (error) {
      console.error('Error fetching swap alternatives:', error);
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

  return (
    <>
      <Card className="bg-[#FFFDF8] border-[#E8E0D4] rounded-xl p-5 hover:-translate-y-0.5 transition-transform duration-200 shadow-sm hover:shadow-md">
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwap}
            disabled={isSwapping}
            className="flex-1 text-xs font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
          >
            {isSwapping ? 'Loading...' : 'Swap'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleServingsChange}
            className="flex-1 text-xs font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
          >
            Servings
          </Button>
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
