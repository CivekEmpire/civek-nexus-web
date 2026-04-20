import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - List redemptions catalog
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT * FROM token_redemptions WHERE enabled = TRUE ORDER BY tokens_cost ASC`
    );
    return NextResponse.json({ redemptions: result.rows });
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 });
  }
}

// POST - Redeem tokens
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, redemption_id } = body;

    if (!user_id || !redemption_id) {
      return NextResponse.json({ error: 'user_id and redemption_id required' }, { status: 400 });
    }

    // Get redemption details
    const redemptionResult = await pool.query(
      `SELECT * FROM token_redemptions WHERE id = $1 AND enabled = TRUE`,
      [redemption_id]
    );

    if (redemptionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    const redemption = redemptionResult.rows[0];

    // Spend tokens
    const spendResult = await pool.query(
      `SELECT spend_tokens($1, $2, $3, $4) as result`,
      [user_id, redemption.tokens_cost, redemption.redemption_name, JSON.stringify({ redemption_id })]
    );

    const spendData = spendResult.rows[0].result;

    if (!spendData.success) {
      return NextResponse.json({ error: spendData.error }, { status: 400 });
    }

    // Log redemption
    await pool.query(
      `INSERT INTO user_redemptions (user_id, redemption_id, tokens_spent)
       VALUES ($1, $2, $3)`,
      [user_id, redemption_id, redemption.tokens_cost]
    );

    return NextResponse.json({
      success: true,
      message: `Redeemed: ${redemption.redemption_name}`,
      new_balance: spendData.new_balance
    });
  } catch (error) {
    console.error('Error redeeming tokens:', error);
    return NextResponse.json({ error: 'Failed to redeem tokens' }, { status: 500 });
  }
}
