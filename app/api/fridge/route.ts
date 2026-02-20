import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ingredients } = body as { ingredients: string };

    if (!ingredients) {
      return NextResponse.json(
        { success: false, error: 'Missing ingredients' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert meal planner helping a household in Mexico City. The user will describe ingredients they have available. Suggest 2-3 recipes they can make.

## DIETARY PREFERENCES (CRITICAL)
- NO black pepper (substitute with white pepper, paprika, cayenne)
- NO fish sauce, oyster sauce, or seafood-derived sauces
- Savory over sweet flavor profiles
- Healthy, whole ingredients

## OUTPUT FORMAT
Respond with ONLY valid JSON matching this format:
{
  "suggestions": [
    {
      "name_en": "English dish name",
      "name_es": "Spanish dish name",
      "description": "Brief appetizing description (2-3 sentences)",
      "match_percentage": 85,
      "missing_ingredients": ["ingredient1", "ingredient2"]
    }
  ]
}

- match_percentage: how well the user's ingredients cover this recipe (0-100)
- missing_ingredients: any key ingredients they'd need to buy (empty array if none)
- Sort suggestions by match_percentage descending
- Respond ONLY with valid JSON.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here are the ingredients I have: ${ingredients}`,
        },
      ],
    });

    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    const parsed = JSON.parse(textContent);

    return NextResponse.json({
      success: true,
      suggestions: parsed.suggestions,
    });
  } catch (error) {
    console.error('[API] Error in fridge mode:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get fridge suggestions',
      },
      { status: 500 }
    );
  }
}
