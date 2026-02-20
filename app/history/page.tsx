'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HistoryMenuItem {
  id: string;
  item_type: string;
  name_en: string;
  name_es: string;
  cuisine: string;
  pairing_group: string | null;
}

interface HistoryMenu {
  id: string;
  week_of: string;
  status: string;
  staple_recommendations: string;
  total_prep_time_minutes: number;
  items: HistoryMenuItem[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<HistoryMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch('/api/menu/history');
        const data = await response.json();

        if (data.success && data.menus) {
          setMenus(data.menus);
        }
      } catch (err) {
        console.error('Error loading history:', err);
        setError('Could not load menu history.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const itemTypeIcons: Record<string, string> = {
    main: '🥘',
    side: '🥗',
    breakfast: '🍳',
    drink: '🥤',
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFFDF8] border-b border-[#E8E0D4] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#2B2B2B] leading-none">
                  Menu History
                </h1>
                <p className="text-sm font-sans text-[#5C5145] mt-1">
                  Past 4 weeks of menus
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="text-sm font-sans border-[#E8E0D4] text-[#5C5145] hover:bg-[#F5F0E8]"
            >
              ← Back to Menu
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {isLoading && (
          <div className="text-center py-16">
            <p className="text-lg font-sans text-[#5C5145]">Loading history...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-sans text-red-800">{error}</p>
          </div>
        )}

        {!isLoading && !error && menus.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-sans text-[#5C5145]">
              No menu history yet. Generate and approve a menu to see it here.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="bg-[#FFFDF8] border border-[#E8E0D4] rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif font-bold text-[#2B2B2B]">
                  Week of{' '}
                  {new Date(menu.week_of).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
                <Badge
                  className="text-xs font-sans uppercase"
                  variant="outline"
                >
                  {menu.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {menu.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F5F0E8] border border-[#E8E0D4] rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{itemTypeIcons[item.item_type] || '🍽'}</span>
                      <span className="text-xs font-sans font-medium text-[#5C5145] uppercase tracking-wider">
                        {item.item_type}
                      </span>
                      {item.pairing_group && item.pairing_group !== 'independent' && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-[#2D5016]/10 text-[#2D5016] border-[#2D5016]/20"
                        >
                          {item.pairing_group}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-serif font-bold text-[#2B2B2B]">
                      {item.name_en}
                    </p>
                    <p className="text-xs font-serif italic text-[#8B6D47]">
                      {item.name_es}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-1 text-[10px] bg-[#F5F0E8] text-[#A0937D] border-[#E8E0D4]"
                    >
                      {item.cuisine}
                    </Badge>
                  </div>
                ))}
              </div>

              {menu.staple_recommendations && (
                <p className="mt-3 text-xs font-sans text-[#5C5145]">
                  Staple: {menu.staple_recommendations}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
