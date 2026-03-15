'use client';

import type { Recipe } from '@/lib/db/recipes';

interface RecipeWithMeta extends Recipe {
  item_type: string;
  name_en: string;
  name_es: string;
  sort_order: number;
}

interface AllRecipesContentProps {
  recipes: RecipeWithMeta[];
}

const categoryLabels: Record<string, string> = {
  produce: 'Frutas y Verduras',
  proteins: 'Carnes y Proteínas',
  dairy: 'Lácteos',
  grains: 'Granos y Cereales',
  pantry: 'Despensa',
  spices: 'Especias y Condimentos',
  liquids: 'Aceites, Vinagres y Líquidos',
  other: 'Otros',
};

const categoryOrder = ['produce', 'proteins', 'dairy', 'grains', 'pantry', 'spices', 'liquids', 'other'];

export function AllRecipesContent({ recipes }: AllRecipesContentProps) {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .recipe-section {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0.5in 0.75in !important;
          }
          .recipe-section h1 { font-size: 24pt !important; }
          .recipe-section h2 { font-size: 16pt !important; }
          .recipe-section p, .recipe-section li { font-size: 11pt !important; }
          .shopping-list { page-break-before: always; }
          .page-break { page-break-before: always; }
        }
        @page {
          size: letter;
          margin: 0.5in;
        }
      `}</style>

      {/* Print button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-[#2D5016] text-white rounded-lg font-sans text-sm hover:bg-[#3D6B22] transition-colors shadow-md"
        >
          Print / Save PDF
        </button>
      </div>

      {recipes.map((recipe, index) => (
        <div
          key={recipe.id}
          className={`recipe-section max-w-[8.5in] mx-auto bg-white min-h-screen px-12 py-10${index > 0 ? ' page-break' : ''}`}
        >
          <RecipeBlock recipe={recipe} />
        </div>
      ))}
    </>
  );
}

function RecipeBlock({ recipe }: { recipe: RecipeWithMeta }) {
  const recipeMarkdown = stripShoppingList(recipe.full_recipe_es);
  const recipeHtml = markdownToHtml(recipeMarkdown);

  const ingredients = recipe.ingredients_json?.ingredients || [];
  const groupedIngredients: Record<string, typeof ingredients> = {};
  for (const ing of ingredients) {
    const cat = ing.category || 'other';
    if (!groupedIngredients[cat]) groupedIngredients[cat] = [];
    groupedIngredients[cat].push(ing);
  }

  return (
    <>
      {/* Recipe body from Markdown */}
      <div
        className="recipe-content font-sans text-[#2B2B2B] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: recipeHtml }}
      />

      {/* Yield statement */}
      {recipe.yield_statement && (
        <div className="mt-6 p-4 bg-[#F5F0E8] rounded-lg">
          <p className="text-sm font-sans font-medium text-[#2B2B2B]">
            {recipe.yield_statement}
          </p>
        </div>
      )}

      {/* Shopping List */}
      <div className="shopping-list mt-12 pt-8 border-t-2 border-[#E8E0D4]">
        <h2 className="text-2xl font-serif font-bold text-[#2B2B2B] mb-6">
          Lista de Compras
        </h2>

        {categoryOrder.map((cat) => {
          const items = groupedIngredients[cat];
          if (!items || items.length === 0) return null;

          return (
            <div key={cat} className="mb-6">
              <h3 className="text-lg font-serif font-bold text-[#8B6D47] mb-3">
                {categoryLabels[cat] || cat}
              </h3>
              <ul className="space-y-1.5">
                {items.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm font-sans text-[#2B2B2B]">
                    <span className="inline-block w-4 h-4 mt-0.5 border border-[#E8E0D4] rounded-sm flex-shrink-0" />
                    <span>
                      {ing.quantity} {ing.unit} — {ing.name_es}
                      {ing.preparation && (
                        <span className="text-[#5C5145] italic"> ({ing.preparation})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

// --- Markdown utilities (same as RecipePageContent) ---

function stripShoppingList(markdown: string): string {
  const pattern = /\n---\s*\n+##\s+Lista de [Cc]ompras/;
  const match = markdown.match(pattern);
  if (match && match.index !== undefined) {
    return markdown.slice(0, match.index).trimEnd();
  }

  const fallbackPattern = /\n##\s+Lista de [Cc]ompras/;
  const fallbackMatch = markdown.match(fallbackPattern);
  if (fallbackMatch && fallbackMatch.index !== undefined) {
    return markdown.slice(0, fallbackMatch.index).trimEnd();
  }

  return markdown;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  let html = '';
  let inOrderedList = false;
  let inUnorderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isOrderedItem = /^\d+\.\s/.test(line);
    const isUnorderedItem = /^[-*]\s/.test(line);

    if (line.trim() === '' && (inOrderedList || inUnorderedList)) {
      const nextNonEmpty = findNextNonEmptyLine(lines, i + 1);
      if (inOrderedList && nextNonEmpty !== null && /^\d+\.\s/.test(nextNonEmpty)) {
        continue;
      }
      if (inUnorderedList && nextNonEmpty !== null && /^[-*]\s/.test(nextNonEmpty)) {
        continue;
      }
    }

    if (inOrderedList && !isOrderedItem) {
      html += '</ol>';
      inOrderedList = false;
    }
    if (inUnorderedList && !isUnorderedItem) {
      html += '</ul>';
      inUnorderedList = false;
    }

    if (line.startsWith('### ')) {
      html += `<h3 class="text-lg font-serif font-bold text-[#2B2B2B] mt-6 mb-3">${formatInline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2 class="text-xl font-serif font-bold text-[#2B2B2B] mt-8 mb-4 pb-2 border-b border-[#E8E0D4]">${formatInline(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      html += `<h1 class="text-3xl font-serif font-bold text-[#2B2B2B] mb-6">${formatInline(line.slice(2))}</h1>`;
      continue;
    }

    if (isOrderedItem) {
      if (!inOrderedList) {
        html += '<ol class="list-decimal pl-6 space-y-2 mb-4">';
        inOrderedList = true;
      }
      const content = line.replace(/^\d+\.\s/, '');
      html += `<li class="text-sm font-sans text-[#2B2B2B] leading-relaxed">${formatInline(content)}</li>`;
      continue;
    }

    if (isUnorderedItem) {
      if (!inUnorderedList) {
        html += '<ul class="list-disc pl-6 space-y-1.5 mb-4">';
        inUnorderedList = true;
      }
      const content = line.replace(/^[-*]\s/, '');
      html += `<li class="text-sm font-sans text-[#2B2B2B] leading-relaxed">${formatInline(content)}</li>`;
      continue;
    }

    if (line.trim() === '') {
      continue;
    }

    html += `<p class="text-sm font-sans text-[#2B2B2B] leading-relaxed mb-3">${formatInline(line)}</p>`;
  }

  if (inOrderedList) html += '</ol>';
  if (inUnorderedList) html += '</ul>';

  return html;
}

function findNextNonEmptyLine(lines: string[], startIndex: number): string | null {
  for (let j = startIndex; j < lines.length; j++) {
    if (lines[j].trim() !== '') return lines[j];
  }
  return null;
}

function formatInline(text: string): string {
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return text;
}
