import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get testament
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT * FROM digital_testaments WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        testament: null,
        message: 'No testament configured'
      });
    }

    return NextResponse.json({
      testament: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching testament:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testament' },
      { status: 500 }
    );
  }
}

// POST - Create or update testament
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      heirs = [],
      instructions = '',
      trigger_conditions = {}
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO digital_testaments (user_id, heirs, instructions, trigger_conditions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
       SET heirs = $2, instructions = $3, trigger_conditions = $4, updated_at = NOW()
       RETURNING *`,
      [user_id, JSON.stringify(heirs), instructions, JSON.stringify(trigger_conditions)]
    );

    return NextResponse.json({
      success: true,
      testament: result.rows[0],
      message: 'Testament saved successfully'
    });
  } catch (error) {
    console.error('Error saving testament:', error);
    return NextResponse.json(
      { error: 'Failed to save testament' },
      { status: 500 }
    );
  }
}
