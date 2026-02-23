import { NextResponse } from 'next/server';
import { getSwapAlternatives } from '@/lib/ai/client';
import { generateSwapSystemPrompt, formatMenuHistory } from '@/lib/ai/prompts';
import { getMenuById, getRecentMenus } from '@/lib/db/menus';
import type { MenuData } from '@/store/menu-store';

export async function POST(request: Request) {
  try {
    console.log('[API] Swap alternatives request received');

    // Parse request body
    const body = await request.json();
    const { menuId, itemId, pairingGroup, currentMenu } = body as {
      menuId: string;
      itemId: string;
      pairingGroup?: string;
      currentMenu?: MenuData;
    };

    if (!menuId || !itemId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Use currentMenu from request body, fall back to database lookup
    let menuItems = currentMenu?.items;
    if (!menuItems) {
      console.log('[API] No currentMenu in request, fetching from database...');
      const menu = await getMenuById(menuId);
      menuItems = menu?.items;
    }

    if (!menuItems || menuItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Menu not found' },
        { status: 404 }
      );
    }

    // Step 2: Find the item to swap (by id, or by sort_order as fallback)
    const itemToSwap = menuItems.find((item) => item.id === itemId);

    if (!itemToSwap) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }
    console.log('[API] Swap - Found item:', itemToSwap.name_en, 'cuisine:', itemToSwap.cuisine);

    // Step 3: Find paired item if this is part of a pairing
    let pairedItem;
    if (pairingGroup && pairingGroup !== 'independent') {
      // Find the other item in the same pairing
      pairedItem = menuItems.find(
        (item) =>
          item.pairing_group === pairingGroup &&
          item.item_type !== itemToSwap.item_type &&
          item.id !== itemId
      );
    }

    // Step 4: Fetch recent menu history
    console.log('[API] Fetching menu history...');
    const recentMenus = await getRecentMenus(4);
    const historyString = formatMenuHistory(recentMenus);

    // Step 5: Build swap system prompt
    const systemPrompt = generateSwapSystemPrompt(
      itemToSwap,
      pairedItem,
      historyString
    );

    // Step 6: Call Claude API for alternatives
    console.log('[API] Calling Claude API for swap alternatives...');
    const swapResponse = await getSwapAlternatives(systemPrompt);

    console.log('[API] Swap alternatives retrieved successfully!');

    // Step 7: Return alternatives
    return NextResponse.json({
      success: true,
      alternatives: swapResponse.alternatives,
      reasoning: swapResponse.reasoning,
      cohesionWarning: pairedItem
        ? `This ${itemToSwap.item_type} is paired with "${pairedItem.name_en}". Ensure culinary cohesion.`
        : undefined
    });
  } catch (error) {
    console.error('[API] Error getting swap alternatives:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get swap alternatives'
      },
      { status: 500 }
    );
  }
}
