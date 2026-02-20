import { NextResponse } from 'next/server';
import { generateMenuWithRetry } from '@/lib/ai/client';
import { generateMenuSystemPrompt, formatMenuHistory } from '@/lib/ai/prompts';
import { getRecentMenus, createDraftMenu, type Menu } from '@/lib/db/menus';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    console.log('[API] Menu generation request received');

    // Parse request body (optional user message)
    const body = await request.json().catch(() => ({}));
    const userMessage = body.message || 'Generate a weekly menu for me.';

    // Step 1: Fetch last 4 weeks of approved menus for history
    console.log('[API] Fetching menu history...');
    let recentMenus: Menu[] = [];
    try {
      recentMenus = await getRecentMenus(4);
    } catch (dbError) {
      console.warn('[API] Could not fetch menu history, proceeding without it:', dbError);
      recentMenus = [];
    }
    const historyString = formatMenuHistory(recentMenus);
    console.log(`[API] Found ${recentMenus.length} recent menus for context`);

    // Step 2: Build system prompt with history
    const systemPrompt = generateMenuSystemPrompt(historyString);

    // Step 3: Call Claude API
    console.log('[API] Calling Claude API...');
    const menuResponse = await generateMenuWithRetry(systemPrompt, userMessage);

    // Step 4: Prepare menu data for database
    const today = new Date();
    const weekOf = new Date(today);
    weekOf.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)

    const menuData = {
      week_of: weekOf.toISOString().split('T')[0],
      staple_recommendations: menuResponse.staple_recommendations,
      total_prep_time_minutes: menuResponse.total_prep_time_minutes,
      time_warning: menuResponse.time_warning,
      items: menuResponse.items,
    };

    // Step 5: Try to save draft to Supabase, but don't fail if DB is unavailable
    console.log('[API] Saving draft to database...');
    let savedMenu;
    try {
      savedMenu = await createDraftMenu(menuData);
    } catch (dbError) {
      console.warn('[API] Could not save to database:', dbError);
    }

    if (savedMenu) {
      console.log('[API] Menu generated and saved:', savedMenu.id);
      return NextResponse.json({
        success: true,
        menu: savedMenu,
      });
    }

    // Fallback: return menu with generated IDs if DB save failed
    console.log('[API] Returning menu without database persistence');
    const menuId = randomUUID();
    const fallbackMenu = {
      id: menuId,
      ...menuData,
      items: menuData.items.map((item, index) => ({
        ...item,
        id: randomUUID(),
        menu_id: menuId,
        sort_order: item.sort_order ?? index,
      })),
    };

    return NextResponse.json({
      success: true,
      menu: fallbackMenu,
    });
  } catch (error) {
    console.error('[API] Error generating menu:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate menu',
      },
      { status: 500 }
    );
  }
}
