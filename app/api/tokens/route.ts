import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get user token balance
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT * FROM user_tokens WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Initialize if doesn't exist
      await pool.query(
        `INSERT INTO user_tokens (user_id) VALUES ($1)`,
        [userId]
      );
      return NextResponse.json({ balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
}

// POST - Award tokens
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, action_type } = body;

    if (!user_id || !action_type) {
      return NextResponse.json({ error: 'user_id and action_type required' }, { status: 400 });
    }

    // Get reward amount
    const rewardResult = await pool.query(
      `SELECT * FROM token_rewards WHERE action_type = $1 AND enabled = TRUE`,
      [action_type]
    );

    if (rewardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid action_type' }, { status: 400 });
    }

    const reward = rewardResult.rows[0];

    // Award tokens using function
    const result = await pool.query(
      `SELECT award_tokens($1, $2, $3, $4) as result`,
      [user_id, reward.tokens_amount, reward.description, JSON.stringify({ action_type })]
    );

    return NextResponse.json(result.rows[0].result);
  } catch (error) {
    console.error('Error awarding tokens:', error);
    return NextResponse.json({ error: 'Failed to award tokens' }, { status: 500 });
  }
}
