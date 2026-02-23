import { notFound } from 'next/navigation';
import { getRecipeById } from '@/lib/db/recipes';
import { RecipePageContent } from './RecipePageContent';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;

  const recipe = await getRecipeById(id);

  if (!recipe) {
    notFound();
  }

  return <RecipePageContent recipe={recipe} />;
}
