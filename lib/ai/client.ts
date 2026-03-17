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
 * If multiple code fences exist, prefer the last one (most likely the JSON).
 */
function extractJSON(text: string): string {
  // Find all markdown code fence blocks; prefer the last match (Claude
  // sometimes adds an explanation block before the JSON block).
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g;
  let lastMatch: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = codeBlockRegex.exec(text)) !== null) {
    lastMatch = m[1].trim();
  }
  if (lastMatch) {
    console.log('[Claude API] Stripped markdown code fences from response');
    return lastMatch;
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
 * Sanitize a JSON string to fix common issues that break JSON.parse:
 * - Control characters inside string values (unescaped tabs, etc.)
 * - Trailing commas before } or ]
 */
function sanitizeJSON(jsonString: string): string {
  let s = jsonString;

  // Remove control characters (U+0000–U+001F) that aren't valid unescaped
  // in JSON strings, EXCEPT for \n (\x0A), \r (\x0D), and \t (\x09) which
  // we replace with their escape sequences.
  s = s.replace(/\t/g, '\\t');
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Remove trailing commas before } or ] (common LLM mistake)
  s = s.replace(/,\s*([\]}])/g, '$1');

  return s;
}

/**
 * Attempt to parse a JSON string, with sanitization fallback.
 * Logs the actual parse error position for debugging.
 */
function safeJSONParse(jsonString: string, label: string): unknown {
  // First attempt: parse as-is
  try {
    return JSON.parse(jsonString);
  } catch (firstError) {
    const pos = firstError instanceof SyntaxError ? firstError.message : 'unknown';
    console.warn(`[Claude API] ${label} first parse failed: ${pos}`);
  }

  // Second attempt: sanitize and retry
  const sanitized = sanitizeJSON(jsonString);
  try {
    console.log(`[Claude API] ${label} retrying with sanitized JSON`);
    return JSON.parse(sanitized);
  } catch (secondError) {
    const pos = secondError instanceof SyntaxError ? secondError.message : 'unknown';
    // Log a window around the error for debugging
    console.error(`[Claude API] ${label} sanitized parse also failed: ${pos}`);
    console.error(`[Claude API] ${label} first 1000 chars:`, jsonString.substring(0, 1000));
    console.error(`[Claude API] ${label} last 500 chars:`, jsonString.substring(jsonString.length - 500));
    throw new Error(`Failed to parse JSON response from Claude (${pos})`);
  }
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

    // Parse JSON response (with sanitization fallback)
    const parsedResponse = safeJSONParse(jsonString, 'Menu');

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

    // Parse JSON response (with sanitization fallback)
    const parsedResponse = safeJSONParse(jsonString, 'Modify') as Record<string, unknown>;

    // Validate response against schema
    const validatedResponse = validateModificationResponse(parsedResponse);

    console.log('[Claude API] Menu modification successful! Items to update:', validatedResponse.modifications?.items_to_update?.length);
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

    // Parse JSON response (with sanitization fallback)
    const parsedResponse = safeJSONParse(jsonString, 'Swap') as Record<string, unknown>;

    // Validate response against schema
    const validatedResponse = validateSwapResponse(parsedResponse);

    console.log('[Claude API] Swap alternatives retrieved! Count:', validatedResponse.alternatives?.length);
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
 * @param userMessage User message (can be overridden for retry)
 * @returns Parsed and validated recipe response
 */
export async function generateRecipeWithClaude(
  systemPrompt: string,
  userMessage: string = 'Generate the complete recipe.'
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
          content: userMessage,
        },
      ],
    }, {
      timeout: 120 * 1000, // 120s — streaming heartbeat keeps Vercel alive, so Claude gets plenty of time
    });

    // Extract text content
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // Extract JSON (handles markdown code fences)
    const jsonString = extractJSON(textContent);

    // Parse JSON response (with sanitization fallback)
    const parsedResponse = safeJSONParse(jsonString, 'Recipe');

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
 * Retry wrapper for recipe generation with one retry attempt.
 * If the first attempt fails due to parse/validation error, retry with
 * a correction prompt emphasizing valid JSON output.
 */
export async function generateRecipeWithRetry(
  systemPrompt: string
): Promise<RecipeGenerationResponse> {
  try {
    return await generateRecipeWithClaude(systemPrompt);
  } catch {
    console.warn('[Claude API] Recipe first attempt failed, retrying with correction prompt...');

    const correctionMessage = `Generate the complete recipe.

CRITICAL: You must respond with ONLY valid JSON. No markdown code blocks, no explanations, no text before or after the JSON. Just pure JSON starting with { and ending with }.
- All string values must be properly escaped (use \\n for newlines, \\" for quotes).
- The "quantity" field must always be a number (e.g., 0.5 not "½").
- Fractions like ½ must appear only inside string fields, never as bare values.`;

    try {
      return await generateRecipeWithClaude(systemPrompt, correctionMessage);
    } catch (retryError) {
      console.error('[Claude API] Recipe retry failed:', retryError);
      throw new Error('Failed to generate recipe after retry');
    }
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
    const jsonString = extractJSON(textContent);
    const parsed = safeJSONParse(jsonString, 'Cohesion') as Record<string, unknown>;

    return {
      cohesive: Boolean(parsed.cohesive),
      reason: String(parsed.reason || '')
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
