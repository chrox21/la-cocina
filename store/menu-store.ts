import { create } from 'zustand';

export interface MenuItem {
  id?: string;
  item_type: 'main' | 'side' | 'breakfast' | 'drink';
  pairing_group: 'A' | 'B' | 'independent' | null;
  name_en: string;
  name_es: string;
  cuisine: string;
  description: string;
  prep_time_minutes: number;
  servings: number;
  user_servings_override?: number | null;
  sort_order: number;
}

export interface MenuData {
  id?: string;
  week_of?: string;
  status?: string;
  staple_recommendations: string;
  total_prep_time_minutes: number;
  time_warning: boolean;
  items: MenuItem[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MenuStore {
  // State
  currentMenu: MenuData | null;
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  error: string | null;
  isChatLoading: boolean;

  // Actions
  setCurrentMenu: (menu: MenuData | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setGenerating: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMenu: () => void;
  setChatLoading: (loading: boolean) => void;

  // Update individual menu item (for servings adjustments)
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  // Initial state
  currentMenu: null,
  chatMessages: [],
  isGenerating: false,
  error: null,
  isChatLoading: false,

  // Actions
  setCurrentMenu: (menu) =>
    set({ currentMenu: menu, error: null }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  setChatMessages: (messages) =>
    set({ chatMessages: messages }),

  setGenerating: (loading) =>
    set({ isGenerating: loading, ...(loading ? { error: null } : {}) }),

  setError: (error) =>
    set({ error }),

  clearMenu: () =>
    set({
      currentMenu: null,
      chatMessages: [],
      error: null,
      isGenerating: false,
    }),

  setChatLoading: (loading) =>
    set({ isChatLoading: loading }),

  updateMenuItem: (itemId, updates) =>
    set((state) => {
      if (!state.currentMenu) return state;

      const updatedItems = state.currentMenu.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );

      return {
        currentMenu: {
          ...state.currentMenu,
          items: updatedItems,
        },
      };
    }),
}));
