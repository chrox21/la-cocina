import { notFound } from 'next/navigation';
import { getRecipesByMenuId } from '@/lib/db/recipes';
import { AllRecipesContent } from './AllRecipesContent';

interface AllRecipesPageProps {
  params: Promise<{ menuId: string }>;
}

export default async function AllRecipesPage({ params }: AllRecipesPageProps) {
  const { menuId } = await params;

  const recipes = await getRecipesByMenuId(menuId);

  if (recipes.length === 0) {
    notFound();
  }

  return <AllRecipesContent recipes={recipes} />;
}
