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

    if (error) throw error;
    return data as Recipe;
  } catch (error) {
    console.error('[DB] Error saving recipe:', error);
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
