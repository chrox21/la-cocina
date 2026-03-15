import Anthropic from '@anthropic-ai/sdk';
import {
  MenuGenerationResponse,
  validateMenuResponse,
  MenuModificationResponse,
  validateModificationResponse,
  SwapAlternativesResponse,
  validateSwapResponse,
  RecipeGenerationResponse,
  validateRecipeResponse
} from './schemas';

// Initialize Anthropic client (will throw at runtime if key is missing)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Extract JSON from Claude's response, handling markdown code fences.
 * Claude often wraps JSON in ```json ... ``` or ``` ... ``` blocks.
 */
function extractJSON(text: string): string {
  // Try to find JSON inside markdown code fences
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    console.log('[Claude API] Stripped markdown code fences from response');
    return codeBlockMatch[1].trim();
  }

  // Try to find a JSON object directly (first { to last })
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  // Return as-is if no patterns found
  return text.trim();
}

/**
 * Generate a menu using Claude API
 * @param systemPrompt System prompt with dietary prefs, cohesion rules, and history
 * @param userMessage User's request for menu generation
 * @returns Parsed and validated menu response
 */
export async function generateMenuWithClaude(
  systemPrompt: string,
  userMessage: string = 'Generate a weekly menu for me.'
): Promise<MenuGenerationResponse> {
  try {
    console.log('[Claude API] Sending menu generation request...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text content
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // Extract JSON (handles markdown code fences)
    const jsonString = extractJSON(textContent);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[Claude API] JSON parse error. Raw response:', textContent.substring(0, 500));
      throw new Error('Failed to parse JSON response from Claude');
    }

    // Validate response against schema
    const validatedResponse = validateMenuResponse(parsedResponse);

    console.log('[Claude API] Menu generation successful!');
    return validatedResponse;
  } catch (error) {
    console.error('[Claude API] Error generating menu:', error);
    throw error;
  }
}

/**
 * Retry wrapper for menu generation with one retry attempt
 * If the first attempt fails due to parse error, retry with correction prompt
 * @param systemPrompt System prompt
 * @param userMessage User message
 * @returns Validated menu response
 */
export async function generateMenuWithRetry(
  systemPrompt: string,
  userMessage: string = 'Generate a weekly menu for me.'
): Promise<MenuGenerationResponse> {
  try {
    return await generateMenuWithClaude(systemPrompt, userMessage);
  } catch {
    console.warn('[Claude API] First attempt failed, retrying with correction prompt...');

    // Retry with a more explicit prompt
    const correctionMessage = `${userMessage}

CRITICAL: You must respond with ONLY valid JSON. No markdown code blocks, no explanations, no text before or after the JSON. Just pure JSON starting with { and ending with }.`;

    try {
      return await generateMenuWithClaude(systemPrompt, correctionMessage);
    } catch (retryError) {
      console.error('[Claude API] Retry failed:', retryError);
      throw new Error('Failed to generate menu after retry');
    }
  }
}

// ============================================================================
// PHASE 3: Menu Modification Functions
// ============================================================================

/**
 * Modify menu based on user message
 * @param systemPrompt System prompt with current menu state
 * @param userMessage User's modification request
 * @returns Parsed and validated modification response
 */
export async function modifyMenuWithClaude(
  systemPrompt: string,
  userMessage: string
): Promise<MenuModificationResponse> {
  try {
    console.log('[Claude API] Sending menu modification request...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text content
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // Extract JSON (handles markdown code fences)
    const jsonString = extractJSON(textContent);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[Claude API] Modify JSON parse error. Raw response:', textContent.substring(0, 500));
      throw new Error('Failed to parse JSON response from Claude');
    }

    // Validate response against schema
    const validatedResponse = validateModificationResponse(parsedResponse);

    console.log('[Claude API] Menu modification successful! Items to update:', parsedResponse.modifications?.items_to_update?.length);
    return validatedResponse;
  } catch (error) {
    console.error('[Claude API] Error modifying menu:', error);
    throw error;
  }
}

/**
 * Get swap alternatives for a specific item
 * @param systemPrompt System prompt with item context
 * @returns Parsed and validated swap alternatives
 */
export async function getSwapAlternatives(
  systemPrompt: string
): Promise<SwapAlternativesResponse> {
  try {
    console.log('[Claude API] Requesting swap alternatives...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate alternatives for this item.',
        },
      ],
    });

    // Extract text content
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // Extract JSON (handles markdown code fences)
    const jsonString = extractJSON(textContent);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[Claude API] Swap JSON parse error. Raw response:', textContent.substring(0, 500));
      throw new Error('Failed to parse JSON response from Claude');
    }

    // Validate response against schema
    const validatedResponse = validateSwapResponse(parsedResponse);

    console.log('[Claude API] Swap alternatives retrieved! Count:', parsedResponse.alternatives?.length);
    return validatedResponse;
  } catch (error) {
    console.error('[Claude API] Error getting swap alternatives:', error);
    throw error;
  }
}

// ============================================================================
// Recipe Generation Functions
// ============================================================================

/**
 * Generate a complete recipe using Claude API
 * @param systemPrompt System prompt with recipe requirements
 * @returns Parsed and validated recipe response
 */
export async function generateRecipeWithClaude(
  systemPrompt: string
): Promise<RecipeGenerationResponse> {
  try {
    console.log('[Claude API] Sending recipe generation request...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate the complete recipe.',
        },
      ],
    }, {
      timeout: 50 * 1000, // 50s — leaves ~10s headroom within Vercel's 60s maxDuration
    });

    // Extract text content
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // Extract JSON (handles markdown code fences)
    const jsonString = extractJSON(textContent);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[Claude API] Recipe JSON parse error. Raw response:', textContent.substring(0, 500));
      throw new Error('Failed to parse JSON response from Claude');
    }

    // Validate response against schema
    const validatedResponse = validateRecipeResponse(parsedResponse);

    console.log('[Claude API] Recipe generation successful! Ingredients count:', validatedResponse.ingredients.length);
    return validatedResponse;
  } catch (error) {
    console.error('[Claude API] Error generating recipe:', error);
    throw error;
  }
}

/**
 * Check cohesion between main and side
 * @param systemPrompt System prompt with both items
 * @returns Cohesion check result
 */
export async function checkCohesion(
  systemPrompt: string
): Promise<{ cohesive: boolean; reason: string }> {
  try {
    console.log('[Claude API] Checking cohesion...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Check if these items pair well together.',
        },
      ],
    });

    // Extract text content
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // Parse JSON response
    const parsed = JSON.parse(textContent);

    return {
      cohesive: parsed.cohesive,
      reason: parsed.reason
    };
  } catch (error) {
    console.error('[Claude API] Error checking cohesion:', error);
    // Default to allowing the change if check fails
    return {
      cohesive: true,
      reason: 'Unable to verify cohesion'
    };
  }
}
