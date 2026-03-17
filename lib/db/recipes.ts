import { getSupabaseServer } from './supabase';

export interface Recipe {
  id?: string;
  menu_item_id: string;
  full_recipe_es: string;
  ingredients_json: {
    ingredients: Array<{
      name_es: string;
      name_en: string;
      quantity: number;
      unit: string;
      category: string;
      preparation?: string;
    }>;
  };
  yield_statement: string;
  equipment: string[];
  generated_at?: string;
}

/**
 * Save a generated recipe to the database
 * @param recipe Recipe data to save
 * @returns The saved recipe with its generated ID, or null on failure
 */
export async function saveRecipe(recipe: {
  menu_item_id: string;
  full_recipe_es: string;
  ingredients_json: Record<string, unknown>;
  yield_statement: string;
  equipment: string[];
}): Promise<Recipe | null> {
  try {
    console.log('[DB] saveRecipe called with menu_item_id:', recipe.menu_item_id);
    console.log('[DB] saveRecipe payload sizes — full_recipe_es:', recipe.full_recipe_es?.length, 'ingredients_json keys:', Object.keys(recipe.ingredients_json), 'equipment:', recipe.equipment?.length, 'yield_statement:', recipe.yield_statement?.length);

    const { data, error } = await getSupabaseServer()
      .from('recipes')
      .insert({
        menu_item_id: recipe.menu_item_id,
        full_recipe_es: recipe.full_recipe_es,
        ingredients_json: recipe.ingredients_json,
        yield_statement: recipe.yield_statement,
        equipment: recipe.equipment,
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Supabase insert error — code:', error.code, 'message:', error.message, 'details:', error.details, 'hint:', error.hint);
      throw error;
    }
    console.log('[DB] Recipe saved successfully, id:', data?.id);
    return data as Recipe;
  } catch (error) {
    console.error('[DB] Error saving recipe — full error:', JSON.stringify(error, null, 2));
    return null;
  }
}

/**
 * Fetch a recipe by its ID
 * @param recipeId Recipe UUID
 * @returns Recipe or null
 */
export async function getRecipeById(recipeId: string): Promise<Recipe | null> {
  try {
    const { data, error } = await getSupabaseServer()
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (error) throw error;
    return data as Recipe;
  } catch (error) {
    console.error('[DB] Error fetching recipe:', error);
    return null;
  }
}

/**
 * Fetch all recipes for a given menu, joined through menu_items.
 * Returns recipes ordered: mains, sides, breakfast, drink.
 */
export async function getRecipesByMenuId(menuId: string): Promise<Array<Recipe & { item_type: string; name_en: string; name_es: string; sort_order: number }>> {
  try {
    const { data, error } = await getSupabaseServer()
      .from('menu_items')
      .select('item_type, name_en, name_es, sort_order, recipes(*)')
      .eq('menu_id', menuId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // Flatten: each menu_item has a nested recipes array (0 or 1 entry)
    const results: Array<Recipe & { item_type: string; name_en: string; name_es: string; sort_order: number }> = [];
    for (const item of data || []) {
      const recipes = item.recipes as unknown as Recipe[];
      if (recipes && recipes.length > 0) {
        results.push({
          ...recipes[0],
          item_type: item.item_type,
          name_en: item.name_en,
          name_es: item.name_es,
          sort_order: item.sort_order,
        });
      }
    }

    // Sort: mains first, then sides, then breakfast, then drink
    const typeOrder: Record<string, number> = { main: 0, side: 1, breakfast: 2, drink: 3 };
    results.sort((a, b) => (typeOrder[a.item_type] ?? 9) - (typeOrder[b.item_type] ?? 9) || a.sort_order - b.sort_order);

    return results;
  } catch (error) {
    console.error('[DB] Error fetching recipes by menu:', error);
    return [];
  }
}

/**
 * Fetch a recipe by its menu_item_id
 * @param menuItemId Menu item UUID
 * @returns Recipe or null
 */
export async function getRecipeByMenuItemId(menuItemId: string): Promise<Recipe | null> {
  try {
    const { data, error } = await getSupabaseServer()
      .from('recipes')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows
      throw error;
    }
    return data as Recipe;
  } catch (error) {
    console.error('[DB] Error fetching recipe by menu item:', error);
    return null;
  }
}
