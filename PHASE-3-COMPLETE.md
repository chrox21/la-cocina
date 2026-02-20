# Phase 3: Chat-Based Menu Modification - Implementation Complete ✓

## What Was Built

### 1. Modification Schemas ✓
**File:** `lib/ai/schemas.ts`
- `MenuModificationResponse` - Natural language message + structured menu updates
- `SwapAlternativesResponse` - 3-5 alternative dishes for swap
- `validateModificationResponse()` - Validation function
- `validateSwapResponse()` - Validation function
- `getModificationSchemaString()` - Schema for prompt injection
- `getSwapSchemaString()` - Swap schema for prompt injection

### 2. Modification Prompts ✓
**File:** `lib/ai/prompts.ts`
- `generateModificationSystemPrompt()` - Chat-based modification prompt with current menu state, dietary prefs, cohesion rules, and history
- `generateSwapSystemPrompt()` - Swap alternatives prompt with pairing context
- `generateCohesionCheckPrompt()` - Simple cohesion check between main and side

### 3. Chat Database Functions ✓
**File:** `lib/db/menus.ts`
- `saveChatMessage()` - Save user/assistant messages to database
- `getChatMessages()` - Retrieve chat history for a menu
- ChatMessage interface defined

### 4. Modification Client Functions ✓
**File:** `lib/ai/client.ts`
- `modifyMenuWithClaude()` - Call Claude for menu modifications
- `getSwapAlternatives()` - Get 3-5 alternative dishes
- `checkCohesion()` - Verify main/side pairing cohesion
- All follow existing retry pattern with error handling

### 5. API Routes ✓

**POST /api/menu/modify**
- Receives user message + current menu state
- Fetches last 4 weeks history for context
- Calls Claude with modification prompt
- Validates and applies modifications
- Saves updated menu to database
- Saves chat messages (user + assistant)
- Returns updated menu + natural language response

**POST /api/menu/swap**
- Receives menuId, itemId, pairingGroup
- Fetches current menu from database
- Finds item to swap and paired item context
- Calls Claude for 3-5 alternatives
- Returns alternatives with cohesion warning if needed

**GET /api/menu/chat**
- Query param: menuId
- Returns array of chat messages ordered by creation time

### 6. Chat UI Integration ✓
**File:** `components/chat/ChatBox.tsx`
- Wired `handleSend()` to POST /api/menu/modify
- Adds user message to store immediately
- Displays loading indicator while waiting
- Adds assistant response to chat
- Updates menu cards in real-time with modifications
- Shows cohesion warnings if present
- Handles errors gracefully

### 7. Dialog Components ✓

**SwapDialog.tsx**
- Modal displaying 3-5 alternative dishes
- Each shows full details (cuisine, names, description, time, servings)
- Click to select → updates menu
- Cancel button to dismiss

**ServingsDialog.tsx**
- Number input with +/- buttons (range 2-8)
- Preview of change (4 → 6 servings)
- Confirm button (disabled if no change)
- Updates user_servings_override field

### 8. Menu Card Wiring ✓
**File:** `components/menu/MenuCard.tsx`
- Made client component with state management
- **Swap button** → fetches alternatives from API → opens SwapDialog
- **Servings button** → opens ServingsDialog → updates menu store
- Shows loading state while fetching swap alternatives
- Both dialogs integrated and functional

### 9. Page Integration ✓
**File:** `app/page.tsx`
- Added useEffect to load chat messages on menu load
- Passes menuId to MenuGrid → PairingGroup → MenuCard
- Chat messages automatically load from database
- setChatMessages imported from store

**Files:** `components/menu/MenuGrid.tsx`, `PairingGroup.tsx`
- Updated to accept and pass menuId prop
- Removed unused callback props
- Simplified component interfaces

## How It Works

### Chat Modification Flow
1. User types message in chat input
2. Message added to chat history immediately
3. POST to `/api/menu/modify` with user message + current menu
4. Claude processes request with full context (menu state, history, dietary prefs, cohesion rules)
5. Claude returns natural language response + structured menu updates
6. Menu cards update in real-time
7. Both user and assistant messages saved to database
8. Cohesion warnings shown if pairing breaks

### Swap Flow
1. User clicks "Swap" button on a dish card
2. POST to `/api/menu/swap` with itemId + menuId
3. Claude generates 3-5 diverse alternatives
4. SwapDialog opens with options
5. User selects alternative
6. Menu updated via Zustand store
7. Card displays new dish immediately

### Servings Adjustment Flow
1. User clicks "Servings" button
2. ServingsDialog opens with current servings
3. User adjusts with +/- buttons (2-8 range)
4. Confirm → updates user_servings_override
5. Card displays new serving count

### Chat Persistence Flow
1. On page load, if currentMenu has an ID:
   - Fetch chat messages from `/api/menu/chat?menuId=...`
   - Populate chat history in store
2. All new messages automatically saved during modification flow
3. Chat history survives page refreshes

## Key Features

✓ **Natural language menu modification** - "Replace the Korean main with something Italian"
✓ **Swap-with-cohesion** - When main swaps, AI suggests updating paired side
✓ **Real-time updates** - Menu cards update instantly after AI response
✓ **Chat persistence** - Messages saved to database, load on mount
✓ **Quick-reply chips** - Pre-defined suggestions populate input
✓ **Swap alternatives** - 3-5 diverse options with full details
✓ **Servings adjustment** - Simple +/- interface (2-8 range)
✓ **Dietary preferences enforced** - All modifications respect no black pepper, no fish sauce rules
✓ **History awareness** - Last 4 weeks injected to avoid repetition
✓ **Error handling** - Graceful fallbacks for API failures

## Testing

### 1. Chat Modification Test
```bash
npm run dev
# Open http://localhost:3000
# Generate a menu
# Type: "Replace the Korean main with something Italian"
```

**Expected:**
- Loading indicator shows
- Assistant responds: "I've replaced the Korean Beef Bulgogi with [Italian dish]"
- Korean card updates to Italian dish in real-time
- Changes saved to database

### 2. Cohesion Warning Test
```bash
# Generate menu with Korean main + Korean side (Pairing A)
# Type: "Change the Korean main to Italian"
```

**Expected:**
- Assistant suggests updating the side for cohesion
- Warning message appears
- Can proceed with swap anyway

### 3. Swap Button Test
```bash
# Click "Swap" button on any dish
```

**Expected:**
- Modal opens with 3-5 alternatives
- Each shows cuisine, names, description, time
- Selecting one updates the menu
- Modal closes

### 4. Servings Button Test
```bash
# Click "Servings" button on any dish
# Change from 4 to 6
# Click "Confirm"
```

**Expected:**
- Modal shows current and new servings
- Card updates to "6 servings"
- user_servings_override saved

### 5. Chat Persistence Test
```bash
# Generate menu
# Have 2-3 chat exchanges
# Refresh page (Cmd+R)
```

**Expected:**
- Chat history loads
- Messages display in correct order
- Can continue conversation

## Build & Lint Status

```bash
✓ npm run build - Passes with no errors
✓ npm run lint - Passes with no errors
✓ TypeScript strict mode - All types validated
```

## API Routes Summary

- ✓ `/api/menu/generate` - Menu generation (Phase 2)
- ✓ `/api/menu/modify` - Chat modification (Phase 3)
- ✓ `/api/menu/swap` - Swap alternatives (Phase 3)
- ✓ `/api/menu/chat` - Fetch messages (Phase 3)

## Database Tables Used

- `menus` - Menu metadata
- `menu_items` - Dishes (updated during modifications)
- `chat_messages` - Chat history (NEW in Phase 3)
- `recipes` - Ready for Phase 4

## Files Created (Phase 3)

**AI Integration:**
- Added to `lib/ai/schemas.ts` - Modification schemas
- Added to `lib/ai/prompts.ts` - Modification prompts
- Added to `lib/ai/client.ts` - Modification client functions

**Database:**
- Added to `lib/db/menus.ts` - Chat message functions

**API Routes:**
- `app/api/menu/modify/route.ts` - Chat modification endpoint
- `app/api/menu/swap/route.ts` - Swap alternatives endpoint
- `app/api/menu/chat/route.ts` - Fetch chat messages endpoint

**Components:**
- `components/menu/SwapDialog.tsx` - Swap alternatives modal
- `components/menu/ServingsDialog.tsx` - Servings adjustment modal

## Files Modified (Phase 3)

- `components/chat/ChatBox.tsx` - Wired handleSend() to API
- `components/menu/MenuCard.tsx` - Added swap and servings functionality
- `components/menu/MenuGrid.tsx` - Pass menuId prop
- `components/menu/PairingGroup.tsx` - Pass menuId prop
- `app/page.tsx` - Load chat messages on mount

## What's Next (Phase 4 & Beyond)

Not yet implemented:
- Recipe generation (full recipes in Mexican Spanish with structured ingredients)
- PDF generation (@react-pdf/renderer)
- Shopping list aggregation
- Fridge Mode
- History page (/history)
- Recipe approval and generation flow

## Architecture Notes

- **Chat-first modification** - All menu changes go through natural language chat
- **Real-time updates** - Zustand store enables instant UI updates
- **Cohesion awareness** - AI checks pairing compatibility when mains swap
- **Context-aware** - Every modification includes current menu state + 4 weeks history
- **Dietary enforcement** - All AI calls include dietary preference rules
- **Database persistence** - Every chat exchange saved for continuity
- **Error resilience** - Graceful fallbacks if API calls fail

---

**Phase 3 Success Metrics:**
✓ All 10 tasks completed
✓ Build passes with no TypeScript errors
✓ Lint passes with no errors
✓ Chat sends and receives messages
✓ Menu cards update in real-time
✓ Swap button opens modal with alternatives
✓ Servings button adjusts serving counts
✓ Chat messages persist to database
✓ Chat history loads on page mount
✓ Cohesion warnings work correctly

**Ready for Phase 4:** Recipe Generation, PDF Export, Shopping Lists, and History
