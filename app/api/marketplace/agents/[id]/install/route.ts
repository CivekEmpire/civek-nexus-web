import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST - Install agent
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Check if agent exists and is approved
    const agentCheck = await pool.query(
      `SELECT * FROM marketplace_agents WHERE id = $1 AND status = 'approved'`,
      [params.id]
    );

    if (agentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found or not approved' },
        { status: 404 }
      );
    }

    const agent = agentCheck.rows[0];

    // Install agent
    const result = await pool.query(
      `INSERT INTO user_agents (user_id, agent_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, agent_id) DO UPDATE
       SET enabled = TRUE, installed_at = NOW()
       RETURNING *`,
      [user_id, params.id]
    );

    // Log analytics
    await pool.query(
      `INSERT INTO agent_analytics (agent_id, user_id, event_type)
       VALUES ($1, $2, 'installed')`,
      [params.id, user_id]
    );

    // Handle payment if needed
    if (agent.pricing_model === 'paid' && agent.price_amount > 0) {
      // TODO: Process payment through Stripe
      // For now, just log revenue (mock)
      await pool.query(
        `INSERT INTO agent_revenue
          (agent_id, creator_id, buyer_id, transaction_type, amount, creator_share, platform_share)
         VALUES ($1, $2, $3, 'purchase', $4, $5, $6)`,
        [
          params.id,
          agent.creator_id,
          user_id,
          agent.price_amount,
          agent.price_amount * 0.70, // 70% to creator
          agent.price_amount * 0.30  // 30% to platform
        ]
      );
    }

    return NextResponse.json({
      success: true,
      installation: result.rows[0],
      message: 'Agent installed successfully'
    });
  } catch (error) {
    console.error('Error installing agent:', error);
    return NextResponse.json(
      { error: 'Failed to install agent' },
      { status: 500 }
    );
  }
}

// DELETE - Uninstall agent
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM user_agents WHERE user_id = $1 AND agent_id = $2`,
      [userId, params.id]
    );

    // Log analytics
    await pool.query(
      `INSERT INTO agent_analytics (agent_id, user_id, event_type)
       VALUES ($1, $2, 'uninstalled')`,
      [params.id, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Agent uninstalled'
    });
  } catch (error) {
    console.error('Error uninstalling agent:', error);
    return NextResponse.json(
      { error: 'Failed to uninstall agent' },
      { status: 500 }
    );
  }
}
