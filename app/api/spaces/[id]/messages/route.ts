import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get messages from space
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // cursor pagination
    const parentId = searchParams.get('parent_id'); // for threads

    let query = `
      SELECT
        m.*,
        u.name as user_name,
        u.email as user_email,
        (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count,
        (SELECT COUNT(*) FROM space_messages WHERE parent_message_id = m.id) as reply_count
      FROM space_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.space_id = $1 AND m.deleted = FALSE
    `;
    const queryParams: any[] = [params.id];

    if (parentId) {
      queryParams.push(parentId);
      query += ` AND m.parent_message_id = $${queryParams.length}`;
    } else {
      query += ` AND m.parent_message_id IS NULL`; // Only top-level messages
    }

    if (before) {
      queryParams.push(before);
      query += ` AND m.created_at < (SELECT created_at FROM space_messages WHERE id = $${queryParams.length})`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const result = await pool.query(query, queryParams);

    return NextResponse.json({
      messages: result.rows.reverse(), // Oldest first
      count: result.rows.length,
      has_more: result.rows.length === limit
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send message
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      user_id,
      content,
      attachments = [],
      mentions = [],
      parent_message_id = null
    } = body;

    if (!user_id || !content) {
      return NextResponse.json(
        { error: 'user_id and content are required' },
        { status: 400 }
      );
    }

    // Check if user is member of space
    const memberCheck = await pool.query(
      `SELECT role FROM space_members WHERE space_id = $1 AND user_id = $2`,
      [params.id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of this space' },
        { status: 403 }
      );
    }

    // For channels, only admins can post
    const spaceCheck = await pool.query(
      `SELECT type FROM spaces WHERE id = $1`,
      [params.id]
    );

    if (spaceCheck.rows[0].type === 'channel') {
      const role = memberCheck.rows[0].role;
      if (!['owner', 'admin'].includes(role)) {
        return NextResponse.json(
          { error: 'Only admins can post in channels' },
          { status: 403 }
        );
      }
    }

    // Insert message
    const result = await pool.query(
      `INSERT INTO space_messages
        (space_id, user_id, content, attachments, mentions, parent_message_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.id,
        user_id,
        content,
        JSON.stringify(attachments),
        JSON.stringify(mentions),
        parent_message_id
      ]
    );

    // Update space updated_at
    await pool.query(
      `UPDATE spaces SET updated_at = NOW() WHERE id = $1`,
      [params.id]
    );

    return NextResponse.json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// PUT - Edit message
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { message_id, user_id, content } = body;

    if (!message_id || !user_id || !content) {
      return NextResponse.json(
        { error: 'message_id, user_id, and content are required' },
        { status: 400 }
      );
    }

    // Check if user owns the message
    const messageCheck = await pool.query(
      `SELECT user_id FROM space_messages WHERE id = $1 AND space_id = $2`,
      [message_id, params.id]
    );

    if (messageCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (messageCheck.rows[0].user_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized. Can only edit own messages' },
        { status: 403 }
      );
    }

    // Update message
    const result = await pool.query(
      `UPDATE space_messages
       SET content = $1, edited = TRUE, edited_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content, message_id]
    );

    return NextResponse.json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    console.error('Error editing message:', error);
    return NextResponse.json(
      { error: 'Failed to edit message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete message
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');
    const userId = searchParams.get('user_id');

    if (!messageId || !userId) {
      return NextResponse.json(
        { error: 'message_id and user_id are required' },
        { status: 400 }
      );
    }

    // Check if user owns the message OR is admin
    const checkResult = await pool.query(
      `SELECT m.user_id, sm.role
       FROM space_messages m
       LEFT JOIN space_members sm ON m.space_id = sm.space_id AND sm.user_id = $2
       WHERE m.id = $1 AND m.space_id = $3`,
      [messageId, userId, params.id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const { user_id: ownerId, role } = checkResult.rows[0];
    if (ownerId !== userId && !['owner', 'admin', 'moderator'].includes(role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Soft delete
    await pool.query(
      `UPDATE space_messages
       SET deleted = TRUE, deleted_at = NOW()
       WHERE id = $1`,
      [messageId]
    );

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
