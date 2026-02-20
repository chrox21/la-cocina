import { NextResponse } from 'next/server';
import { getChatMessages } from '@/lib/db/menus';

export async function GET(request: Request) {
  try {
    // Extract menuId from query params
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('menuId');

    if (!menuId) {
      return NextResponse.json(
        { success: false, error: 'menuId query parameter required' },
        { status: 400 }
      );
    }

    console.log(`[API] Fetching chat messages for menu ${menuId}...`);

    // Fetch chat messages from database
    const messages = await getChatMessages(menuId);

    console.log(`[API] Found ${messages.length} chat messages`);

    return NextResponse.json({
      success: true,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }))
    });
  } catch (error) {
    console.error('[API] Error fetching chat messages:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chat messages'
      },
      { status: 500 }
    );
  }
}
