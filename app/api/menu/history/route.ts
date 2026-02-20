import { NextResponse } from 'next/server';
import { getRecentMenus } from '@/lib/db/menus';

export async function GET() {
  try {
    const menus = await getRecentMenus(4);

    return NextResponse.json({
      success: true,
      menus,
    });
  } catch (error) {
    console.error('[API] Error fetching menu history:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch menu history',
      },
      { status: 500 }
    );
  }
}
