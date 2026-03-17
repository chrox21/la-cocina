import { generateRecipeWithRetry } from '@/lib/ai/client';
import { generateRecipeSystemPrompt } from '@/lib/ai/prompts';
import { saveRecipe } from '@/lib/db/recipes';

// Fallback for non-streaming environments; Vercel Hobby max is 60s
export const maxDuration = 60;

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
  // Validate request body before starting the stream
  let body: RecipeGenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { menuItemId, nameEn, nameEs, cuisine, itemType, description, servings } = body;

  if (!menuItemId || !nameEn || !nameEs || !cuisine || !itemType || !description || !servings) {
    return Response.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Return a streaming response so Vercel keeps the function alive.
  // Heartbeat spaces are sent every 5s while Claude generates the recipe.
  // The final JSON payload is appended at the end — the client's response.json()
  // reads the full body and JSON.parse ignores the leading whitespace.
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(' '));
        } catch {
          clearInterval(heartbeat);
        }
      }, 5000);

      try {
        const systemPrompt = generateRecipeSystemPrompt({
          name_en: nameEn,
          name_es: nameEs,
          cuisine,
          item_type: itemType,
          description,
          servings,
        });

        const recipeResponse = await generateRecipeWithRetry(systemPrompt);

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

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              success: true,
              recipe: {
                id: savedRecipe.id,
                full_recipe_es: recipeResponse.full_recipe_es,
                ingredients: recipeResponse.ingredients,
                yield_statement: recipeResponse.yield_statement,
                equipment: recipeResponse.equipment,
              },
            })
          )
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate recipe',
            })
          )
        );
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
