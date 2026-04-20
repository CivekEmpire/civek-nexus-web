import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST - Report oath violation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reported_user_id,
      reporter_user_id,
      violation_type,
      description,
      evidence = {}
    } = body;

    if (!reported_user_id || !violation_type || !description) {
      return NextResponse.json(
        { error: 'reported_user_id, violation_type, and description are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO oath_violations
        (reported_user_id, reporter_user_id, violation_type, description, evidence)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reported_user_id, reporter_user_id, violation_type, description, JSON.stringify(evidence)]
    );

    return NextResponse.json({
      success: true,
      violation: result.rows[0],
      message: 'Violation reported successfully'
    });
  } catch (error) {
    console.error('Error reporting violation:', error);
    return NextResponse.json(
      { error: 'Failed to report violation' },
      { status: 500 }
    );
  }
}

// GET - Get violations (for review)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status') || 'pending';

    let query = '';
    let params: any[] = [];

    if (userId) {
      query = `SELECT * FROM oath_violations
               WHERE reported_user_id = $1
               ORDER BY created_at DESC`;
      params = [userId];
    } else {
      query = `SELECT * FROM oath_violations
               WHERE status = $1
               ORDER BY created_at DESC
               LIMIT 50`;
      params = [status];
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      violations: result.rows
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch violations' },
      { status: 500 }
    );
  }
}
