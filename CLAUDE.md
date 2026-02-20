# La Cocina de Christian

## Project Overview

AI-powered weekly meal planning web app for a household in Mexico City. The app generates cohesive weekly menus, produces professional chef-quality recipes in Mexican Spanish, and creates organized shopping lists — all printable for a non-technical cook.

**Live URL:** la-cocina-ruby.vercel.app
**Repo:** github.com/chrox21/la-cocina

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **State Management:** zustand (client state for draft menus, chat, UI)
- **Database:** Supabase (PostgreSQL) — menu history, approved recipes, shopping lists
- **AI:** Claude API (Sonnet 4) via Anthropic SDK — menu generation, chat modifications, recipe generation, fridge mode
- **PDF:** @react-pdf/renderer — server-side PDF generation for recipes + shopping list
- **Hosting:** Vercel (free tier, auto-deploys from GitHub)
- **Fonts:** Playfair Display (headings) + DM Sans (body) — warm, food-appropriate aesthetic

## Development Commands

- `npm run dev` — Start dev server at http://localhost:3000
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm start` — Run production server

## Environment Variables (in .env.local)

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
```

All Claude API calls happen server-side only (API routes). Keys are never exposed to the browser.

## Architecture

### App Router Structure

```
app/
├── layout.tsx              # Root layout (Playfair Display + DM Sans fonts, metadata)
├── page.tsx                # Main page — menu generation, review, Fridge Mode toggle
├── history/
│   └── page.tsx            # Browse past menus
└── api/
    ├── menu/
    │   ├── generate/route.ts   # Menu generation via Claude
    │   ├── modify/route.ts     # Chat-based menu modification
    │   └── history/route.ts    # Retrieve past menus (last 4 weeks)
    ├── recipes/
    │   ├── generate/route.ts   # Full recipe generation (streamed)
    │   └── pdf/route.ts        # PDF generation & download
    └── fridge/route.ts         # Fridge Mode endpoint
```

### Component Structure

```
components/
├── menu/
│   ├── MenuCard.tsx          # Individual dish card (bilingual names, cuisine tag, time, servings, swap/servings buttons)
│   ├── MenuGrid.tsx          # Grid layout for menu cards
│   ├── PairingGroup.tsx      # Visual grouping of main + paired side (Pairing A, Pairing B)
│   └── TimeBudget.tsx        # Cook time budget indicator (flags if >4 hours)
├── chat/
│   ├── ChatBox.tsx           # Chat input + message history + quick-reply suggestions
│   └── ChatMessage.tsx       # Individual chat bubble
├── recipe/
│   ├── RecipeView.tsx        # On-screen recipe display
│   └── ShoppingList.tsx      # Shopping list display (full or mini per selected items)
└── ui/                       # shadcn/ui components
```

### Library Code

```
lib/
├── ai/
│   ├── prompts.ts            # All system prompts (menu gen, modification, recipe gen, fridge mode)
│   ├── schemas.ts            # JSON schemas for AI output validation
│   └── client.ts             # Claude API client wrapper
├── db/
│   ├── supabase.ts           # Supabase client initialization
│   ├── menus.ts              # Menu CRUD operations
│   └── recipes.ts            # Recipe CRUD operations
├── pdf/
│   ├── RecipeTemplate.tsx    # PDF recipe page template (one recipe per page)
│   └── ShoppingListTemplate.tsx  # PDF shopping list template
└── utils/
    ├── shopping-list.ts      # Ingredient aggregation logic (deterministic, not AI)
    └── servings.ts           # Serving size scaling math
```

### State Management

```
store/
└── menu-store.ts             # Zustand store for draft menu, chat messages, UI state, serving overrides
```

## Design System

### Color Palette
- Background: #F5F0E8 (warm linen)
- Cards: #FFFDF8 (warm white)
- Borders: #E8E0D4 (warm gray)
- Primary text: #2B2B2B
- Secondary text: #5C5145
- Accent text: #8B6D47 (warm brown)
- Primary action: linear-gradient(135deg, #2D5016, #3D6B22) (avocado green)
- Badges/tags: #F5F0E8 background with #A0937D text

### Typography
- Headings: 'Playfair Display', Georgia, serif
- Body: 'DM Sans', -apple-system, sans-serif
- Card titles: 17px Playfair Display bold
- Card descriptions: 13.5px DM Sans
- Labels/tags: 11px DM Sans uppercase with letter-spacing

### Layout
- Desktop-first, max-width 1280px centered
- Main content area: flex 62% for menu cards, 35% sticky chat panel (max 400px)
- Menu cards have 12px border-radius, subtle hover lift (translateY -2px), warm shadow
- Pairing groups have green gradient badges ("Pairing A", "Pairing B")
- Extras section (breakfast + drink) has brown badge

## Database Schema (Supabase)

### Table: menus
- id (uuid PK), created_at (timestamp), week_of (date), status (text: draft/approved/archived)
- staple_recommendations (text), total_prep_time_minutes (int), time_warning (boolean)

### Table: menu_items
- id (uuid PK), menu_id (uuid FK → menus), item_type (text: main/side/breakfast/drink)
- pairing_group (text: A/B/independent), name_en (text), name_es (text)
- cuisine (text), description (text), prep_time_minutes (int)
- servings (int), user_servings_override (int nullable), sort_order (int)

### Table: recipes
- id (uuid PK), menu_item_id (uuid FK → menu_items)
- full_recipe_es (text, Markdown), ingredients_json (jsonb), yield_statement (text)
- equipment (text[]), generated_at (timestamp)

### Table: chat_messages
- id (uuid PK), menu_id (uuid FK → menus), role (text: user/assistant)
- content (text), created_at (timestamp)

### Ingredient JSON Structure (in recipes.ingredients_json)
```json
{
  "ingredients": [
    {
      "name_es": "pechuga de pollo",
      "name_en": "chicken breast",
      "quantity": 500,
      "unit": "g",
      "category": "proteins",
      "preparation": "deshuesada, sin piel"
    }
  ]
}
```

Shopping list categories: produce (Frutas y verduras), proteins (Carnes y proteínas), dairy (Lácteos), grains (Granos y cereales), pantry (Despensa), spices (Especias y condimentos), liquids (Aceites, vinagres y líquidos), other (Otros)

## AI Prompt Design

### Four AI Jobs

1. **Menu Generation** — Returns structured JSON menu. System prompt includes dietary preferences, cohesion rules, cuisine diversity, last 4 weeks history, seasonal awareness.
2. **Menu Modification (Chat)** — Returns natural language message + JSON menu updates. Understands which items to change, flags side updates for cohesion.
3. **Recipe Generation** — Returns complete recipes in Mexican Spanish (Markdown) + structured ingredient JSON. Chef-level quality, precise portions, stainless steel tips, equipment notes.
4. **Fridge Mode** — Returns 2-3 recipe suggestions with ingredient match percentages from user-described available ingredients.

### Dietary Preferences (apply to ALL recipes)
- No black pepper (substitute white pepper, paprika, etc.)
- No fish sauce, oyster sauce, or seafood-derived sauces (use soy sauce, coconut aminos)
- Savory over sweet flavor profiles
- Healthy by default: whole ingredients, lean proteins, plenty of vegetables
- No food allergies

### Menu Structure
- 2 main protein dishes (batch-sized, 3-4 servings each)
- 2 side dishes (each paired with a main for culinary cohesion)
- 1 agua fresca or fresh juice
- 1 breakfast prep item
- Recommended staple (rice, pasta, grain) noted but not a separate recipe

### Cohesion Rules
- Mains and sides organized in pairings (A and B)
- Each pairing must be culinarily cohesive (Asian main + Asian side, not random)
- Two pairings should differ in cuisine for variety
- Breakfast and drink are independent

### Recipe Quality Requirements
- Written in natural Mexican Spanish
- Professional chef perspective — proper technique, logical flow, correct terminology
- Extremely precise portion control (e.g., "Rinde: 4 porciones de aproximadamente 250g cada una")
- Exact measurements: grams for solids, cups/ml for liquids, Celsius for temperatures
- Mexican Spanish ingredient names (jitomate, elote, aguacate, chile serrano)
- Inline stainless steel cooking tips where relevant
- Equipment notes (stovetop, oven, air fryer, Instant Pot)
- No vague instructions — always specify visual/texture/temperature cues

### Output Validation
- All AI responses that update menu or generate recipes must return structured JSON
- System prompt specifies JSON schema, ends with "Respond ONLY with valid JSON"
- API route validates response against schema before passing to frontend
- On parse failure, retry once with correction prompt

## Key Business Rules

### Cook Time Budget
- Total prep+cook time displayed prominently
- Soft warning if total exceeds ~240 minutes (4 hours)
- User can proceed anyway — it's a guideline, not a hard limit

### Serving Scaling
- Small adjustments (0.5x to 2x): client-side proportional math, no AI call
- Large adjustments (beyond 2x or below 0.5x): re-generate recipe via Claude API
- PDF always reflects final serving sizes

### Shopping List Aggregation
- Generated programmatically (NOT by AI) from ingredients_json
- Group by name_es, sum quantities for matching ingredients with same unit
- Sort by category, then alphabetically
- Mini shopping lists: same logic but filtered to selected items only

### Draft Auto-Persistence
- Every menu modification auto-saves draft to Supabase
- Page refresh or browser close → draft survives, loads on reopen
- Only one draft per week; new generation overwrites previous draft
- Chat messages also persisted for modification history

### Menu History
- Last 4 weeks of approved menus stored
- Injected into Claude's system prompt to avoid repetition
- User can ask about past menus conversationally
- Repeat requests honored (user asks for a dish again → appears regardless of history)

## PDF Output

- One recipe per page, large readable font
- Section headers: Ingredientes, Equipo Necesario, Instrucciones
- Yield statement, prep time, cook time on every recipe
- Shopping list as final page(s) with checkboxes organized by category
- Paper size: US Letter (8.5" × 11")
- All text in Mexican Spanish

## Performance Targets

- Menu generation: 10-15 seconds
- Menu modification (chat): 3-8 seconds
- Full recipe generation: 20-30 seconds (streamed progressively)
- PDF download: near-instant from stored data
- Page load: < 2 seconds

## Important Context

- **No authentication** — public URL, anyone with the link can use it
- **Desktop-first** — primary use is laptop/desktop, responsive for mobile but desktop is design target
- **The cook is not a user** — she receives printed output only, speaks only Spanish, not tech-comfortable
- **Portion control is critical** — the cook historically over-prepares; recipes must leave zero ambiguity about quantities
- **Bilingual dish names** — all dish names show English + Spanish throughout the UI
- **UI language is English** — all recipe/shopping list output is Mexican Spanish
