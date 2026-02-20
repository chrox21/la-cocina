import { NextResponse } from 'next/server';
import { approveMenu } from '@/lib/db/menus';

// Simple UUID v4 format check
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { menuId } = body as { menuId: string };

    if (!menuId) {
      return NextResponse.json(
        { success: false, error: 'Missing menuId' },
        { status: 400 }
      );
    }

    // Guard against mock/invalid IDs that would cause Supabase UUID type errors
    if (!isValidUUID(menuId)) {
      return NextResponse.json(
        { success: false, error: 'Please generate a real menu first before approving. The current menu is sample data.' },
        { status: 400 }
      );
    }

    const success = await approveMenu(menuId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to approve menu' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error approving menu:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve menu',
      },
      { status: 500 }
    );
  }
}
