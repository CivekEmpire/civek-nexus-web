import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/references - Get references for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toUserId = searchParams.get('to_user_id');
    const circleType = searchParams.get('circle_type');

    if (!toUserId) {
      return NextResponse.json({ error: 'to_user_id required' }, { status: 400 });
    }

    let query = `
      SELECT r.*,
             u.name as from_user_name,
             u.email as from_user_email
      FROM references r
      JOIN users u ON r.from_user_id = u.id
      WHERE r.to_user_id = $1 AND r.status = 'approved'
    `;
    const params: any[] = [toUserId];

    if (circleType) {
      query += ' AND r.circle_type = $2';
      params.push(circleType);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await db.query(query, params);

    return NextResponse.json({
      references: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('GET /api/references error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/references - Submit a reference
export async function POST(request: Request) {
  try {
    const fromUserId = request.headers.get('x-user-id');

    if (!fromUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to_user_id, circle_type, content, rating } = body;

    // Validate
    if (!to_user_id || !circle_type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['vida', 'negocios', 'elite'].includes(circle_type)) {
      return NextResponse.json(
        { error: 'Invalid circle_type' },
        { status: 400 }
      );
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Cannot reference yourself
    if (fromUserId === to_user_id) {
      return NextResponse.json(
        { error: 'Cannot reference yourself' },
        { status: 400 }
      );
    }

    // Insert reference
    const result = await db.query(
      `INSERT INTO references (from_user_id, to_user_id, circle_type, content, rating, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (from_user_id, to_user_id, circle_type)
       DO UPDATE SET
         content = $4,
         rating = $5,
         created_at = NOW()
       RETURNING *`,
      [fromUserId, to_user_id, circle_type, content, rating || null]
    );

    return NextResponse.json({
      reference: result.rows[0],
      message: 'Reference submitted successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/references error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
