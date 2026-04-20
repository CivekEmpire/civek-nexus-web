import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Check if user has accepted oath
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
      `SELECT oath_version, accepted_at, next_reminder
       FROM nexus_oaths
       WHERE user_id = $1
       ORDER BY accepted_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        accepted: false,
        message: 'Oath not accepted yet'
      });
    }

    return NextResponse.json({
      accepted: true,
      oath: result.rows[0]
    });
  } catch (error) {
    console.error('Error checking oath:', error);
    return NextResponse.json(
      { error: 'Failed to check oath status' },
      { status: 500 }
    );
  }
}

// POST - Accept oath
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, oath_version = 'v1.0' } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Calculate next reminder (1 year from now)
    const nextReminder = new Date();
    nextReminder.setFullYear(nextReminder.getFullYear() + 1);

    // Insert oath acceptance
    const result = await pool.query(
      `INSERT INTO nexus_oaths (user_id, oath_version, ip_address, user_agent, next_reminder)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, oath_version) DO UPDATE
       SET accepted_at = NOW(),
           ip_address = $3,
           user_agent = $4,
           next_reminder = $5
       RETURNING *`,
      [user_id, oath_version, ip, userAgent, nextReminder]
    );

    // Initialize score components if not exists
    await pool.query(
      `INSERT INTO nexus_score_components (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user_id]
    );

    // Add trust points for accepting oath
    await pool.query(
      `UPDATE nexus_score_components
       SET trust_score = trust_score + 10
       WHERE user_id = $1`,
      [user_id]
    );

    // Log transaction
    await pool.query(
      `INSERT INTO score_transactions (user_id, component, points_change, reason)
       VALUES ($1, 'trust', 10, 'Nexus Oath accepted')`,
      [user_id]
    );

    return NextResponse.json({
      success: true,
      oath: result.rows[0],
      message: 'Oath accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting oath:', error);
    return NextResponse.json(
      { error: 'Failed to accept oath' },
      { status: 500 }
    );
  }
}
