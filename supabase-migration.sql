-- La Cocina Database Schema Migration
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: menus
-- Stores menu metadata for each week
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  week_of DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'archived')),
  staple_recommendations TEXT,
  total_prep_time_minutes INTEGER,
  time_warning BOOLEAN DEFAULT FALSE
);

-- Index for querying recent menus
CREATE INDEX idx_menus_week_of ON menus(week_of DESC);
CREATE INDEX idx_menus_status ON menus(status);

-- Table: menu_items
-- Stores individual dishes within a menu
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('main', 'side', 'breakfast', 'drink')),
  pairing_group TEXT CHECK (pairing_group IN ('A', 'B', 'independent')),
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  cuisine TEXT,
  description TEXT,
  prep_time_minutes INTEGER,
  servings INTEGER NOT NULL DEFAULT 4,
  user_servings_override INTEGER,
  sort_order INTEGER DEFAULT 0
);

-- Index for efficient menu_items queries
CREATE INDEX idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX idx_menu_items_sort_order ON menu_items(menu_id, sort_order);

-- Table: recipes
-- Stores full recipe details for approved menu items
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  full_recipe_es TEXT NOT NULL,
  ingredients_json JSONB NOT NULL,
  yield_statement TEXT,
  equipment TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for recipe lookups
CREATE INDEX idx_recipes_menu_item_id ON recipes(menu_item_id);

-- Table: chat_messages
-- Stores chat conversation history for menu modifications
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for chat message retrieval
CREATE INDEX idx_chat_messages_menu_id ON chat_messages(menu_id, created_at);

-- Add comments for documentation
COMMENT ON TABLE menus IS 'Weekly menu metadata and status';
COMMENT ON TABLE menu_items IS 'Individual dishes within a menu (mains, sides, breakfast, drink)';
COMMENT ON TABLE recipes IS 'Full recipe details in Mexican Spanish with structured ingredient data';
COMMENT ON TABLE chat_messages IS 'Chat conversation history for menu modifications';

COMMENT ON COLUMN menu_items.pairing_group IS 'Culinary pairing group: A, B, or independent (for breakfast/drink)';
COMMENT ON COLUMN recipes.ingredients_json IS 'Structured ingredient data with quantities, units, categories, and preparations';
COMMENT ON COLUMN recipes.full_recipe_es IS 'Complete recipe in Mexican Spanish (Markdown format)';
