import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - List deals
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const stage = searchParams.get('stage');
    const dealType = searchParams.get('deal_type');

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

    let query = `
      SELECT d.*,
             dp.role as user_role,
             (SELECT COUNT(*) FROM deal_participants WHERE deal_id = d.id) as participant_count
      FROM deals d
      LEFT JOIN deal_participants dp ON d.id = dp.deal_id AND dp.user_id = $1
      WHERE (d.owner_id = $1 OR dp.user_id = $1 OR d.visibility = 'elite')
      AND d.status = 'active'
    `;
    const params: any[] = [userId];

    if (stage) {
      params.push(stage);
      query += ` AND d.stage = $${params.length}`;
    }

    if (dealType) {
      params.push(dealType);
      query += ` AND d.deal_type = $${params.length}`;
    }

    query += ` ORDER BY d.updated_at DESC LIMIT 50`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      deals: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST - Create deal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      title,
      description,
      deal_type,
      amount,
      currency = 'USD',
      sector,
      visibility = 'elite'
    } = body;

    if (!user_id || !title || !deal_type) {
      return NextResponse.json(
        { error: 'user_id, title, and deal_type are required' },
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create deal
      const dealResult = await client.query(
        `INSERT INTO deals (title, description, deal_type, amount, currency, sector, owner_id, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [title, description, deal_type, amount, currency, sector, user_id, visibility]
      );

      const deal = dealResult.rows[0];

      // Add owner as lead participant
      await client.query(
        `INSERT INTO deal_participants (deal_id, user_id, role)
         VALUES ($1, $2, 'lead')`,
        [deal.id, user_id]
      );

      // Log activity
      await client.query(
        `INSERT INTO deal_activity (deal_id, user_id, activity_type, description)
         VALUES ($1, $2, 'created', 'Deal created')`,
        [deal.id, user_id]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        deal,
        message: 'Deal created successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
