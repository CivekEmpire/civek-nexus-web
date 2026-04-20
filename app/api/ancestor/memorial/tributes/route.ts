import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST - Add tribute to memorial
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      memorial_id,
      author_user_id = null,
      author_name,
      tribute_text,
      tribute_type = 'message',
      media_url = ''
    } = body;

    if (!memorial_id || !author_name || !tribute_text) {
      return NextResponse.json(
        { error: 'memorial_id, author_name, and tribute_text are required' },
        { status: 400 }
      );
    }

    // Check if memorial allows tributes
    const memorialResult = await pool.query(
      `SELECT allow_tributes, visibility FROM memorial_profiles WHERE id = $1`,
      [memorial_id]
    );

    if (memorialResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Memorial not found' },
        { status: 404 }
      );
    }

    if (!memorialResult.rows[0].allow_tributes) {
      return NextResponse.json(
        { error: 'This memorial does not allow tributes' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `INSERT INTO memorial_tributes (
        memorial_id, author_user_id, author_name,
        tribute_text, tribute_type, media_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [memorial_id, author_user_id, author_name, tribute_text, tribute_type, media_url]
    );

    return NextResponse.json({
      success: true,
      tribute: result.rows[0],
      message: 'Tribute added successfully'
    });
  } catch (error) {
    console.error('Error adding tribute:', error);
    return NextResponse.json(
      { error: 'Failed to add tribute' },
      { status: 500 }
    );
  }
}

// PUT - Approve/reject tribute
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tribute_id, is_approved } = body;

    if (!tribute_id || is_approved === undefined) {
      return NextResponse.json(
        { error: 'tribute_id and is_approved are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE memorial_tributes
       SET is_approved = $2
       WHERE id = $1
       RETURNING *`,
      [tribute_id, is_approved]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tribute not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tribute: result.rows[0],
      message: is_approved ? 'Tribute approved' : 'Tribute rejected'
    });
  } catch (error) {
    console.error('Error updating tribute:', error);
    return NextResponse.json(
      { error: 'Failed to update tribute' },
      { status: 500 }
    );
  }
}
