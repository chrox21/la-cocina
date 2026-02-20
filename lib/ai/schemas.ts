/**
 * TypeScript types and JSON schemas for AI-generated menu responses
 */

export interface MenuItemSchema {
  item_type: 'main' | 'side' | 'breakfast' | 'drink';
  pairing_group: 'A' | 'B' | 'independent' | null;
  name_en: string;
  name_es: string;
  cuisine: string;
  description: string;
  prep_time_minutes: number;
  servings: number;
  sort_order: number;
}

export interface MenuGenerationResponse {
  items: MenuItemSchema[];
  staple_recommendations: string;
  total_prep_time_minutes: number;
  time_warning: boolean;
}

/**
 * JSON schema for Claude API response validation
 * This schema is injected into the system prompt
 */
export const menuGenerationJsonSchema = {
  type: 'object',
  required: ['items', 'staple_recommendations', 'total_prep_time_minutes', 'time_warning'],
  properties: {
    items: {
      type: 'array',
      minItems: 6,
      maxItems: 6,
      items: {
        type: 'object',
        required: [
          'item_type',
          'pairing_group',
          'name_en',
          'name_es',
          'cuisine',
          'description',
          'prep_time_minutes',
          'servings',
          'sort_order'
        ],
        properties: {
          item_type: {
            type: 'string',
            enum: ['main', 'side', 'breakfast', 'drink']
          },
          pairing_group: {
            type: ['string', 'null'],
            enum: ['A', 'B', 'independent', null]
          },
          name_en: {
            type: 'string',
            description: 'English name of the dish'
          },
          name_es: {
            type: 'string',
            description: 'Spanish name of the dish'
          },
          cuisine: {
            type: 'string',
            description: 'Cuisine type (e.g., Korean, Italian, Mexican)'
          },
          description: {
            type: 'string',
            description: 'Brief description of the dish (2-3 sentences max)'
          },
          prep_time_minutes: {
            type: 'integer',
            minimum: 5,
            description: 'Total prep + cook time in minutes'
          },
          servings: {
            type: 'integer',
            minimum: 2,
            maximum: 6,
            description: 'Number of servings'
          },
          sort_order: {
            type: 'integer',
            minimum: 0,
            description: 'Display order in the menu'
          }
        }
      }
    },
    staple_recommendations: {
      type: 'string',
      description: 'Recommended staple (rice, pasta, grain) to accompany the meals'
    },
    total_prep_time_minutes: {
      type: 'integer',
      description: 'Total time to prepare all dishes in the menu'
    },
    time_warning: {
      type: 'boolean',
      description: 'True if total_prep_time_minutes exceeds 240 minutes (4 hours)'
    }
  }
};

/**
 * Validate a menu generation response against the schema
 * @param response Parsed JSON response from Claude
 * @returns Validated MenuGenerationResponse or throws error
 */
export function validateMenuResponse(response: unknown): MenuGenerationResponse {
  // Basic type checking
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  const r = response as Record<string, unknown>;

  if (!Array.isArray(r.items) || r.items.length !== 6) {
    throw new Error('Response must contain exactly 6 items');
  }

  if (typeof r.staple_recommendations !== 'string') {
    throw new Error('staple_recommendations must be a string');
  }

  if (typeof r.total_prep_time_minutes !== 'number') {
    throw new Error('total_prep_time_minutes must be a number');
  }

  if (typeof r.time_warning !== 'boolean') {
    throw new Error('time_warning must be a boolean');
  }

  // Validate each item (basic validation)
  r.items.forEach((item, index: number) => {
    const i = item as Record<string, unknown>;

    if (!['main', 'side', 'breakfast', 'drink'].includes(i.item_type as string)) {
      throw new Error(`Item ${index}: invalid item_type`);
    }

    if (i.pairing_group !== null && !['A', 'B', 'independent'].includes(i.pairing_group as string)) {
      throw new Error(`Item ${index}: invalid pairing_group`);
    }

    if (!i.name_en || !i.name_es || !i.cuisine || !i.description) {
      throw new Error(`Item ${index}: missing required string fields`);
    }

    if (typeof i.prep_time_minutes !== 'number' || i.prep_time_minutes < 5) {
      throw new Error(`Item ${index}: invalid prep_time_minutes`);
    }

    if (typeof i.servings !== 'number' || i.servings < 2 || i.servings > 6) {
      throw new Error(`Item ${index}: invalid servings`);
    }

    if (typeof i.sort_order !== 'number') {
      throw new Error(`Item ${index}: invalid sort_order`);
    }
  });

  return response as MenuGenerationResponse;
}

/**
 * Get the JSON schema as a formatted string for prompt injection
 */
export function getMenuSchemaString(): string {
  return JSON.stringify(menuGenerationJsonSchema, null, 2);
}

// ============================================================================
// PHASE 3: Menu Modification Schemas
// ============================================================================

/**
 * Response format for menu modification via chat
 * Returns natural language message + structured menu updates
 */
export interface MenuModificationResponse {
  message: string; // Natural language response to user
  modifications: {
    items_to_update: MenuItemSchema[]; // Items with changes (must include id)
    cohesion_warning?: string; // Warning if pairing loses cohesion
    suggest_side_swap?: boolean; // True if main swapped and side should update
  };
}

/**
 * Response format for swap alternatives
 * Returns 3-5 alternative dishes for a specific item
 */
export interface SwapAlternativesResponse {
  alternatives: MenuItemSchema[]; // 3-5 alternative dishes
  reasoning: string; // Why these alternatives were suggested
}

/**
 * JSON schema for menu modification response
 */
export const menuModificationJsonSchema = {
  type: 'object',
  required: ['message', 'modifications'],
  properties: {
    message: {
      type: 'string',
      description: 'Natural language response to the user explaining the changes'
    },
    modifications: {
      type: 'object',
      required: ['items_to_update'],
      properties: {
        items_to_update: {
          type: 'array',
          items: {
            type: 'object',
            description: 'Updated menu items (must include id field to identify which item to update)'
          }
        },
        cohesion_warning: {
          type: 'string',
          description: 'Optional warning if a pairing loses culinary cohesion'
        },
        suggest_side_swap: {
          type: 'boolean',
          description: 'True if a main was swapped and the paired side should be updated for cohesion'
        }
      }
    }
  }
};

/**
 * JSON schema for swap alternatives response
 */
export const swapAlternativesJsonSchema = {
  type: 'object',
  required: ['alternatives', 'reasoning'],
  properties: {
    alternatives: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        description: 'Alternative dish with full menu item details'
      }
    },
    reasoning: {
      type: 'string',
      description: 'Explanation of why these alternatives were suggested'
    }
  }
};

/**
 * Validate a menu modification response
 */
export function validateModificationResponse(response: unknown): MenuModificationResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  const r = response as Record<string, unknown>;

  if (typeof r.message !== 'string') {
    throw new Error('message must be a string');
  }

  if (!r.modifications || typeof r.modifications !== 'object') {
    throw new Error('modifications must be an object');
  }

  const mods = r.modifications as Record<string, unknown>;

  if (!Array.isArray(mods.items_to_update)) {
    throw new Error('modifications.items_to_update must be an array');
  }

  // Basic validation - items_to_update should have menu item fields
  if (mods.items_to_update.length === 0) {
    throw new Error('modifications.items_to_update cannot be empty');
  }

  return response as MenuModificationResponse;
}

/**
 * Validate a swap alternatives response
 */
export function validateSwapResponse(response: unknown): SwapAlternativesResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  const r = response as Record<string, unknown>;

  if (!Array.isArray(r.alternatives)) {
    throw new Error('alternatives must be an array');
  }

  if (r.alternatives.length < 3 || r.alternatives.length > 5) {
    throw new Error('alternatives must contain 3-5 items');
  }

  if (typeof r.reasoning !== 'string') {
    throw new Error('reasoning must be a string');
  }

  return response as SwapAlternativesResponse;
}

/**
 * Get modification schema as formatted string for prompt injection
 */
export function getModificationSchemaString(): string {
  return JSON.stringify(menuModificationJsonSchema, null, 2);
}

/**
 * Get swap schema as formatted string for prompt injection
 */
export function getSwapSchemaString(): string {
  return JSON.stringify(swapAlternativesJsonSchema, null, 2);
}
