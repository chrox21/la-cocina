import { NextResponse } from 'next/server';
import { generateRecipeWithClaude } from '@/lib/ai/client';
import { generateRecipeSystemPrompt } from '@/lib/ai/prompts';
import { saveRecipe } from '@/lib/db/recipes';

interface RecipeGenerateRequest {
  menuItemId: string;
  nameEn: string;
  nameEs: string;
  cuisine: string;
  itemType: string;
  description: string;
  servings: number;
}

export async function POST(request: Request) {
  try {
    console.log('[API] Recipe generation request received');

    const body: RecipeGenerateRequest = await request.json();
    const { menuItemId, nameEn, nameEs, cuisine, itemType, description, servings } = body;

    // Validate required fields
    if (!menuItemId || !nameEn || !nameEs || !cuisine || !itemType || !description || !servings) {
      console.error('[API] Missing required fields:', { menuItemId, nameEn, nameEs, cuisine, itemType, description, servings });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[API] Generating recipe for: "${nameEn}" (${nameEs})`);
    console.log(`[API] Serving size received: ${servings}`);
    console.log(`[API] Cuisine: ${cuisine}, Type: ${itemType}`);

    // Step 1: Build the recipe generation system prompt
    const systemPrompt = generateRecipeSystemPrompt({
      name_en: nameEn,
      name_es: nameEs,
      cuisine,
      item_type: itemType,
      description,
      servings,
    });

    // Step 2: Call Claude API for recipe generation
    console.log('[API] Calling Claude API for recipe generation...');
    const recipeResponse = await generateRecipeWithClaude(systemPrompt);
    console.log('[API] Claude API returned recipe successfully');
    console.log(`[API] Yield statement: ${recipeResponse.yield_statement}`);
    console.log(`[API] Ingredients count: ${recipeResponse.ingredients.length}`);
    console.log(`[API] Equipment: ${recipeResponse.equipment.join(', ')}`);

    // Step 3: Save recipe to Supabase
    console.log('[API] Saving recipe to Supabase...');
    const savedRecipe = await saveRecipe({
      menu_item_id: menuItemId,
      full_recipe_es: recipeResponse.full_recipe_es,
      ingredients_json: { ingredients: recipeResponse.ingredients },
      yield_statement: recipeResponse.yield_statement,
      equipment: recipeResponse.equipment,
    });

    if (!savedRecipe) {
      throw new Error('Failed to save recipe to database');
    }

    console.log(`[API] Recipe saved successfully! ID: ${savedRecipe.id}`);

    // Step 4: Return the recipe
    return NextResponse.json({
      success: true,
      recipe: {
        id: savedRecipe.id,
        full_recipe_es: recipeResponse.full_recipe_es,
        ingredients: recipeResponse.ingredients,
        yield_statement: recipeResponse.yield_statement,
        equipment: recipeResponse.equipment,
      },
    });
  } catch (error) {
    console.error('[API] Error generating recipe:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate recipe',
      },
      { status: 500 }
    );
  }
}
