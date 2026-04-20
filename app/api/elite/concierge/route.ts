import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get concierge requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Verify elite membership
    const eliteCheck = await pool.query(
      `SELECT is_elite_member($1) as is_elite`,
      [userId]
    );

    if (!eliteCheck.rows[0].is_elite) {
      return NextResponse.json(
        { error: 'Elite membership required' },
        { status: 403 }
      );
    }

    let query = `SELECT * FROM concierge_requests WHERE user_id = $1`;
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      created_at DESC
      LIMIT 50`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      requests: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST - Create concierge request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      request_type,
      title,
      description,
      priority = 'medium'
    } = body;

    if (!user_id || !request_type || !title || !description) {
      return NextResponse.json(
        { error: 'user_id, request_type, title, and description are required' },
        { status: 400 }
      );
    }

    // Verify elite membership
    const eliteCheck = await pool.query(
      `SELECT is_elite_member($1) as is_elite`,
      [user_id]
    );

    if (!eliteCheck.rows[0].is_elite) {
      return NextResponse.json(
        { error: 'Elite membership required' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `INSERT INTO concierge_requests (user_id, request_type, title, description, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, request_type, title, description, priority]
    );

    // TODO: Trigger AI concierge agent to process request

    return NextResponse.json({
      success: true,
      request: result.rows[0],
      message: 'Request submitted. Our concierge will respond shortly.'
    });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}
