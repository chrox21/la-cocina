'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MenuGrid } from '@/components/menu/MenuGrid';
import { TimeBudget } from '@/components/menu/TimeBudget';
import { ChatBox } from '@/components/chat/ChatBox';
import { FridgeDialog } from '@/components/menu/FridgeDialog';
import { useMenuStore } from '@/store/menu-store';
import { mockMenuData } from '@/lib/utils/mock-data';

export default function HomeClient() {
  const router = useRouter();
  const {
    currentMenu,
    setCurrentMenu,
    isGenerating,
    setGenerating,
    setError,
    error,
    setChatMessages,
  } = useMenuStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [showFridgeDialog, setShowFridgeDialog] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const { recipeStates, setRecipeState } = useMenuStore();

  // Load mock data on first render
  useEffect(() => {
    if (!isInitialized && !currentMenu) {
      setCurrentMenu(mockMenuData);
      setIsInitialized(true);
    }
  }, [isInitialized, currentMenu, setCurrentMenu]);

  // Load chat messages when menu loads
  useEffect(() => {
    if (currentMenu?.id && !currentMenu.id.startsWith('mock-')) {
      fetch(`/api/menu/chat?menuId=${currentMenu.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages) {
            setChatMessages(data.messages);
          }
        })
        .catch(err => console.error('Error loading chat messages:', err));
    }
  }, [currentMenu?.id, setChatMessages]);

  const handleGenerateMenu = async () => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/menu/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Generate a weekly menu for me.' }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate menu');
      }

      // Update store with generated menu
      setCurrentMenu(data.menu);
      setChatMessages([]);
    } catch (err) {
      console.error('Error generating menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate menu');
    } finally {
      setGenerating(false);
    }
  };

  const isMockMenu = currentMenu?.id?.startsWith('mock-') ?? true;

  // Count approved items for View All button state
  const approvedCount = currentMenu
    ? currentMenu.items.filter((item) => item.id && recipeStates[item.id]?.status === 'approved').length
    : 0;
  const anyGenerating = currentMenu
    ? currentMenu.items.some((item) => item.id && recipeStates[item.id]?.status === 'generating')
    : false;

  const handleApproveAll = async () => {
    if (!currentMenu?.items) return;

    if (isMockMenu) {
      setError('Please generate a real menu first before approving. The current menu is sample data.');
      return;
    }

    setIsApprovingAll(true);
    setError(null);

    // Find all unapproved items (skip items already approved or generating)
    const itemsToApprove = currentMenu.items.filter((item) => {
      if (!item.id) return false;
      const state = recipeStates[item.id];
      return !state || state.status === 'idle';
    });

    if (itemsToApprove.length === 0) {
      setIsApprovingAll(false);
      return;
    }

    // Generate recipes one at a time so we stay within Vercel concurrency
    // limits. Each card flips to "generating" only when its turn starts,
    // then to "approved" or back to "idle" when done — giving the user
    // visible progress as each recipe completes.
    let failedCount = 0;

    for (const item of itemsToApprove) {
      if (!item.id) continue;

      const approvedServings = item.user_servings_override || item.servings;
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

        const text = await response.text();
        const data = JSON.parse(text.trim());

        if (data.success && data.recipe?.id) {
          setRecipeState(item.id, { status: 'approved', recipeId: data.recipe.id });
        } else {
          console.error(`[ApproveAll] Recipe generation failed for ${item.name_en}:`, data.error);
          setRecipeState(item.id, { status: 'idle' });
          failedCount++;
        }
      } catch (error) {
        console.error(`[ApproveAll] Error generating recipe for ${item.name_en}:`, error);
        setRecipeState(item.id, { status: 'idle' });
        failedCount++;
      }
    }

    if (failedCount > 0) {
      setError(`${failedCount} recipe(s) failed to generate. You can retry by clicking Approve on individual cards.`);
    }

    setIsApprovingAll(false);
  };

  const handleViewAll = () => {
    if (!currentMenu?.id) return;
    window.open(`/recipes/${currentMenu.id}`, '_blank');
  };

  if (!currentMenu) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-sans text-[#5C5145]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFFDF8] border-b border-[#E8E0D4] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍳</span>
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#2B2B2B] leading-none">
                  La Cocina
                </h1>
                <p className="text-lg font-serif font-light text-[#8B6D47] leading-none">
                  de Christian
                </p>
              </div>
            </div>

            {/* Header Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleGenerateMenu}
                disabled={isGenerating}
                className="text-sm font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
              >
                {isGenerating ? 'Generating...' : '🔄 Regenerate'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFridgeDialog(true)}
                className="text-sm font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
              >
                🥶 Fridge Mode
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/history')}
                className="text-sm font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
              >
                📖 History
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Column - Menu Cards (62%) */}
          <div className="flex-[0.62]">
            {/* Time Budget */}
            <TimeBudget
              totalMinutes={currentMenu.total_prep_time_minutes}
              timeWarning={currentMenu.time_warning}
            />

            {/* Staple Recommendation */}
            {currentMenu.staple_recommendations && (
              <div className="mb-6 p-4 bg-[#FFFDF8] border-2 border-dashed border-[#E8E0D4] rounded-xl">
                <h3 className="text-sm font-sans font-medium text-[#2B2B2B] mb-2">
                  Recommended Staple
                </h3>
                <p className="text-sm font-sans text-[#5C5145]">
                  {currentMenu.staple_recommendations}
                </p>
              </div>
            )}

            {/* Menu Grid */}
            <MenuGrid items={currentMenu.items} menuId={currentMenu.id} />

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-sans text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <Button
                onClick={handleApproveAll}
                disabled={isGenerating || isApprovingAll || anyGenerating || isMockMenu}
                className="flex-1 text-sm font-sans font-medium py-6 text-[#FFFDF8]"
                style={{
                  background: isGenerating || isApprovingAll || anyGenerating || isMockMenu
                    ? '#A0937D'
                    : 'linear-gradient(135deg, #2D5016, #3D6B22)',
                }}
              >
                {isApprovingAll || anyGenerating ? 'Generating Recipes...' : isMockMenu ? 'Generate a Menu First' : 'Approve All'}
              </Button>
              <Button
                onClick={handleViewAll}
                disabled={approvedCount === 0}
                variant="outline"
                className="text-sm font-sans font-medium py-6 px-6 border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
              >
                View All ({approvedCount})
              </Button>
            </div>
          </div>

          {/* Right Column - Chat Panel (35%) */}
          <div className="flex-[0.35] max-w-[400px]">
            <div className="sticky top-24 h-[calc(100vh-8rem)]">
              <ChatBox />
            </div>
          </div>
        </div>
      </main>

      {/* Fridge Mode Dialog */}
      <FridgeDialog
        open={showFridgeDialog}
        onClose={() => setShowFridgeDialog(false)}
      />
    </div>
  );
}
