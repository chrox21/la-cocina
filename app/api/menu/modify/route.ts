import { NextResponse } from 'next/server';
import { modifyMenuWithClaude } from '@/lib/ai/client';
import { generateModificationSystemPrompt, formatMenuHistory } from '@/lib/ai/prompts';
import { getRecentMenus, updateMenuItems, saveChatMessage } from '@/lib/db/menus';
import type { MenuData } from '@/store/menu-store';

export async function POST(request: Request) {
  try {
    console.log('[API] Menu modification request received');

    // Parse request body
    const body = await request.json();
    const { menuId, userMessage, currentMenu } = body as {
      menuId: string;
      userMessage: string;
      currentMenu: MenuData;
    };

    if (!menuId || !userMessage || !currentMenu) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Fetch recent menu history for context
    console.log('[API] Fetching menu history...');
    const recentMenus = await getRecentMenus(4);
    const historyString = formatMenuHistory(recentMenus);
    console.log(`[API] Found ${recentMenus.length} recent menus for context`);

    // Step 2: Build modification system prompt with current menu + history
    const systemPrompt = generateModificationSystemPrompt(currentMenu, historyString);

    // Step 3: Call Claude API for modification
    console.log('[API] Calling Claude API for modification...');
    const modificationResponse = await modifyMenuWithClaude(systemPrompt, userMessage);

    // Step 4: Apply modifications to menu
    console.log('[API] Applying modifications...');
    const itemsToUpdate = modificationResponse.modifications.items_to_update;

    // Normalize items_to_update: Claude sometimes returns item_type in uppercase
    const normalizedUpdates = itemsToUpdate.map(u => ({
      ...u,
      item_type: (u.item_type as string).toLowerCase() as typeof u.item_type,
    }));

    const updatedItems = currentMenu.items.map((item) => {
      // Primary match: sort_order + item_type (most reliable)
      let update = normalizedUpdates.find(
        (updated) => updated.sort_order === item.sort_order && updated.item_type === item.item_type
      );

      // Fallback match: item_type + pairing_group (in case sort_order is missing/wrong)
      if (!update) {
        update = normalizedUpdates.find(
          (updated) => updated.item_type === item.item_type && updated.pairing_group === item.pairing_group
        );
      }

      // If found, merge the updates while preserving id and sort_order
      if (update) {
        return {
          ...item,
          ...update,
          id: item.id,
          sort_order: item.sort_order,
        };
      }

      return item;
    });

    // Recalculate total prep time
    const totalPrepTime = updatedItems.reduce(
      (sum, item) => sum + (item.prep_time_minutes || 0),
      0
    );

    const updatedMenu: MenuData = {
      ...currentMenu,
      items: updatedItems,
      total_prep_time_minutes: totalPrepTime,
      time_warning: totalPrepTime > 240
    };

    // Step 5: Save updated menu to database
    console.log('[API] Saving updated menu to database...');
    await updateMenuItems(menuId, updatedItems);

    // Step 6: Save chat messages
    console.log('[API] Saving chat messages...');
    await saveChatMessage(menuId, 'user', userMessage);
    await saveChatMessage(menuId, 'assistant', modificationResponse.message);

    console.log('[API] Menu modification successful!');

    // Step 7: Return updated menu + assistant response
    return NextResponse.json({
      success: true,
      message: modificationResponse.message,
      updatedMenu,
      cohesionWarning: modificationResponse.modifications.cohesion_warning
    });
  } catch (error) {
    console.error('[API] Error modifying menu:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to modify menu'
      },
      { status: 500 }
    );
  }
}
