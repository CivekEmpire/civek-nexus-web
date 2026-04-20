import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get reactions for a message
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');

    if (!messageId) {
      return NextResponse.json(
        { error: 'message_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
        mr.emoji,
        mr.user_id,
        mr.created_at,
        u.name as user_name
       FROM message_reactions mr
       LEFT JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       ORDER BY mr.created_at ASC`,
      [messageId]
    );

    // Group by emoji
    const grouped = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.emoji]) {
        acc[row.emoji] = {
          emoji: row.emoji,
          count: 0,
          users: []
        };
      }
      acc[row.emoji].count++;
      acc[row.emoji].users.push({
        user_id: row.user_id,
        name: row.user_name
      });
      return acc;
    }, {});

    return NextResponse.json({
      reactions: Object.values(grouped)
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

// POST - Add reaction
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { message_id, user_id, emoji } = body;

    if (!message_id || !user_id || !emoji) {
      return NextResponse.json(
        { error: 'message_id, user_id, and emoji are required' },
        { status: 400 }
      );
    }

    // Verify message exists in space
    const messageCheck = await pool.query(
      `SELECT id FROM space_messages WHERE id = $1 AND space_id = $2`,
      [message_id, params.id]
    );

    if (messageCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Message not found in this space' },
        { status: 404 }
      );
    }

    // Verify user is member
    const memberCheck = await pool.query(
      `SELECT user_id FROM space_members WHERE space_id = $1 AND user_id = $2`,
      [params.id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of this space' },
        { status: 403 }
      );
    }

    // Add reaction (or ignore if already exists)
    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING
       RETURNING *`,
      [message_id, user_id, emoji]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Reaction already exists'
      });
    }

    return NextResponse.json({
      success: true,
      reaction: result.rows[0],
      message: 'Reaction added'
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// DELETE - Remove reaction
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');
    const userId = searchParams.get('user_id');
    const emoji = searchParams.get('emoji');

    if (!messageId || !userId || !emoji) {
      return NextResponse.json(
        { error: 'message_id, user_id, and emoji are required' },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM message_reactions
       WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, emoji]
    );

    return NextResponse.json({
      success: true,
      message: 'Reaction removed'
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
