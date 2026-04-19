import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/circles - Get user's circles
export async function GET(request: Request) {
  try {
    // TODO: Get user_id from auth session
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.query(
      'SELECT * FROM user_circles WHERE user_id = $1',
      [userId]
    );

    return NextResponse.json({
      circles: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('GET /api/circles error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/circles - Create or update user circle
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { circle_type, profile_data } = body;

    // Validate circle_type
    if (!['vida', 'negocios', 'elite'].includes(circle_type)) {
      return NextResponse.json(
        { error: 'Invalid circle_type' },
        { status: 400 }
      );
    }

    // Upsert circle
    const result = await db.query(
      `INSERT INTO user_circles (user_id, circle_type, profile_data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         circle_type = $2,
         profile_data = $3,
         updated_at = NOW()
       RETURNING *`,
      [userId, circle_type, JSON.stringify(profile_data || {})]
    );

    return NextResponse.json({
      circle: result.rows[0],
      message: 'Circle updated successfully'
    });
  } catch (error) {
    console.error('POST /api/circles error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
