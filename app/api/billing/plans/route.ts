import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - List subscription plans
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const circleType = searchParams.get('circle_type');

    let query = 'SELECT * FROM subscription_plans WHERE enabled = TRUE';
    const params: any[] = [];

    if (circleType) {
      params.push(circleType);
      query += ` AND circle_type = $${params.length}`;
    }

    query += ' ORDER BY display_order ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({
      plans: result.rows
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
