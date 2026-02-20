import { getSupabaseServer } from './supabase';

export type MenuStatus = 'draft' | 'approved' | 'archived';

export interface MenuItem {
  id?: string;
  menu_id?: string;
  item_type: 'main' | 'side' | 'breakfast' | 'drink';
  pairing_group: 'A' | 'B' | 'independent' | null;
  name_en: string;
  name_es: string;
  cuisine: string;
  description: string;
  prep_time_minutes: number;
  servings: number;
  user_servings_override?: number | null;
  sort_order: number;
}

export interface Menu {
  id?: string;
  created_at?: string;
  week_of: string;
  status: MenuStatus;
  staple_recommendations: string;
  total_prep_time_minutes: number;
  time_warning: boolean;
  items?: MenuItem[];
}

/**
 * Fetch recent approved menus for history injection into prompts
 * @param weeks Number of weeks to look back
 * @returns Array of menus with their items
 */
export async function getRecentMenus(weeks: number = 4): Promise<Menu[]> {
  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - (weeks * 7));

    const { data: menus, error: menuError } = await getSupabaseServer()
      .from('menus')
      .select('*')
      .eq('status', 'approved')
      .gte('week_of', dateThreshold.toISOString().split('T')[0])
      .order('week_of', { ascending: false });

    if (menuError) throw menuError;
    if (!menus || menus.length === 0) return [];

    // Fetch items for all menus
    const menuIds = menus.map(m => m.id);
    const { data: items, error: itemsError } = await getSupabaseServer()
      .from('menu_items')
      .select('*')
      .in('menu_id', menuIds)
      .order('sort_order');

    if (itemsError) throw itemsError;

    // Group items by menu
    const menusWithItems: Menu[] = menus.map(menu => ({
      ...menu,
      items: items?.filter(item => item.menu_id === menu.id) || []
    }));

    return menusWithItems;
  } catch (error) {
    console.error('Error fetching recent menus:', error);
    return [];
  }
}

/**
 * Create a new draft menu with menu items
 * @param menuData Menu and items data
 * @returns Created menu with IDs
 */
export async function createDraftMenu(menuData: {
  week_of: string;
  staple_recommendations: string;
  total_prep_time_minutes: number;
  time_warning: boolean;
  items: MenuItem[];
}): Promise<Menu | null> {
  try {
    // Insert menu
    const { data: menu, error: menuError } = await getSupabaseServer()
      .from('menus')
      .insert({
        week_of: menuData.week_of,
        status: 'draft',
        staple_recommendations: menuData.staple_recommendations,
        total_prep_time_minutes: menuData.total_prep_time_minutes,
        time_warning: menuData.time_warning
      })
      .select()
      .single();

    if (menuError) throw menuError;
    if (!menu) throw new Error('Failed to create menu');

    // Insert menu items
    const itemsWithMenuId = menuData.items.map(item => ({
      ...item,
      menu_id: menu.id
    }));

    const { data: items, error: itemsError } = await getSupabaseServer()
      .from('menu_items')
      .insert(itemsWithMenuId)
      .select();

    if (itemsError) throw itemsError;

    return {
      ...menu,
      items: items || []
    };
  } catch (error) {
    console.error('Error creating draft menu:', error);
    return null;
  }
}

/**
 * Update menu items for an existing menu
 * @param menuId Menu UUID
 * @param items Updated items array
 * @returns Success boolean
 */
export async function updateMenuItems(menuId: string, items: MenuItem[]): Promise<boolean> {
  try {
    // Delete existing items
    const { error: deleteError } = await getSupabaseServer()
      .from('menu_items')
      .delete()
      .eq('menu_id', menuId);

    if (deleteError) throw deleteError;

    // Insert updated items
    const itemsWithMenuId = items.map(item => ({
      ...item,
      menu_id: menuId
    }));

    const { error: insertError } = await getSupabaseServer()
      .from('menu_items')
      .insert(itemsWithMenuId);

    if (insertError) throw insertError;

    return true;
  } catch (error) {
    console.error('Error updating menu items:', error);
    return false;
  }
}

/**
 * Fetch a menu by ID with all its items
 * @param menuId Menu UUID
 * @returns Menu with items or null
 */
export async function getMenuById(menuId: string): Promise<Menu | null> {
  try {
    const { data: menu, error: menuError } = await getSupabaseServer()
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .single();

    if (menuError) throw menuError;
    if (!menu) return null;

    const { data: items, error: itemsError } = await getSupabaseServer()
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('sort_order');

    if (itemsError) throw itemsError;

    return {
      ...menu,
      items: items || []
    };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return null;
  }
}

/**
 * Approve a menu (change status from draft to approved)
 * @param menuId Menu UUID
 * @returns Success boolean
 */
export async function approveMenu(menuId: string): Promise<boolean> {
  try {
    const { error } = await getSupabaseServer()
      .from('menus')
      .update({ status: 'approved' })
      .eq('id', menuId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error approving menu:', error);
    return false;
  }
}

/**
 * Get the current draft menu (if any exists)
 * @returns Draft menu or null
 */
export async function getCurrentDraft(): Promise<Menu | null> {
  try {
    const { data: menu, error: menuError } = await getSupabaseServer()
      .from('menus')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (menuError) {
      if (menuError.code === 'PGRST116') return null; // No rows returned
      throw menuError;
    }
    if (!menu) return null;

    const { data: items, error: itemsError } = await getSupabaseServer()
      .from('menu_items')
      .select('*')
      .eq('menu_id', menu.id)
      .order('sort_order');

    if (itemsError) throw itemsError;

    return {
      ...menu,
      items: items || []
    };
  } catch (error) {
    console.error('Error fetching current draft:', error);
    return null;
  }
}

// ============================================================================
// PHASE 3: Chat Message Persistence
// ============================================================================

export interface ChatMessage {
  id?: string;
  menu_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

/**
 * Save a chat message to the database
 * @param menuId Menu UUID
 * @param role Message role (user or assistant)
 * @param content Message content
 * @returns Success boolean
 */
export async function saveChatMessage(
  menuId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<boolean> {
  try {
    const { error } = await getSupabaseServer()
      .from('chat_messages')
      .insert({
        menu_id: menuId,
        role,
        content
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving chat message:', error);
    return false;
  }
}

/**
 * Get all chat messages for a menu
 * @param menuId Menu UUID
 * @returns Array of chat messages ordered by creation time
 */
export async function getChatMessages(menuId: string): Promise<ChatMessage[]> {
  try {
    const { data: messages, error } = await getSupabaseServer()
      .from('chat_messages')
      .select('*')
      .eq('menu_id', menuId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return messages || [];
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }
}
