import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get Distribeaute integration and data
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

    // Get integration
    const integrationResult = await pool.query(
      `SELECT * FROM distribeaute_integrations WHERE user_id = $1`,
      [userId]
    );

    // Get products
    const productsResult = await pool.query(
      `SELECT * FROM distribeaute_products
       WHERE is_available = TRUE
       ORDER BY is_featured DESC, product_name ASC
       LIMIT 50`
    );

    // Get commissions
    const commissionsResult = await pool.query(
      `SELECT * FROM distribeaute_commissions
       WHERE user_id = $1
       ORDER BY commission_period DESC
       LIMIT 12`,
      [userId]
    );

    // Calculate total pending commissions
    const pendingResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as pending_total
       FROM distribeaute_commissions
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    return NextResponse.json({
      integration: integrationResult.rows.length > 0 ? integrationResult.rows[0] : null,
      products: productsResult.rows,
      commissions: commissionsResult.rows,
      pending_commissions: parseFloat(pendingResult.rows[0].pending_total)
    });
  } catch (error) {
    console.error('Error fetching Distribeaute data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Distribeaute data' },
      { status: 500 }
    );
  }
}

// POST - Create or update integration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      sponsor_user_id = null,
      distributor_level = 'customer',
      preferences = {}
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO distribeaute_integrations (
        user_id, sponsor_user_id, distributor_level, preferences,
        enrollment_date, integration_status
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'active')
      ON CONFLICT (user_id) DO UPDATE
      SET preferences = $4, updated_at = NOW()
      RETURNING *`,
      [user_id, sponsor_user_id, distributor_level, JSON.stringify(preferences)]
    );

    // Update sponsor's downline count if applicable
    if (sponsor_user_id) {
      await pool.query(
        `UPDATE distribeaute_integrations
         SET downline_count = downline_count + 1
         WHERE user_id = $1`,
        [sponsor_user_id]
      );
    }

    return NextResponse.json({
      success: true,
      integration: result.rows[0],
      message: 'Distribeaute integration activated'
    });
  } catch (error) {
    console.error('Error activating Distribeaute integration:', error);
    return NextResponse.json(
      { error: 'Failed to activate Distribeaute integration' },
      { status: 500 }
    );
  }
}
