import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get Hipobid integration status and tenders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Get integration status
    const integrationResult = await pool.query(
      `SELECT * FROM hipobid_integrations WHERE user_id = $1`,
      [userId]
    );

    // Get tenders
    let tenderQuery = `SELECT * FROM hipobid_tenders WHERE user_id = $1`;
    const queryParams: any[] = [userId];

    if (status) {
      tenderQuery += ` AND status = $2`;
      queryParams.push(status);
    }

    tenderQuery += ` ORDER BY submission_deadline ASC, created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const tendersResult = await pool.query(tenderQuery, queryParams);

    // Get unread notifications
    const notificationsResult = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM hipobid_notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return NextResponse.json({
      integration: integrationResult.rows.length > 0 ? integrationResult.rows[0] : null,
      tenders: tendersResult.rows,
      unread_notifications: parseInt(notificationsResult.rows[0].unread_count)
    });
  } catch (error) {
    console.error('Error fetching Hipobid data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Hipobid data' },
      { status: 500 }
    );
  }
}

// POST - Create or update integration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, sync_settings = {} } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO hipobid_integrations (user_id, sync_settings, integration_status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (user_id) DO UPDATE
       SET sync_settings = $2, updated_at = NOW()
       RETURNING *`,
      [user_id, JSON.stringify(sync_settings)]
    );

    return NextResponse.json({
      success: true,
      integration: result.rows[0],
      message: 'Hipobid integration activated'
    });
  } catch (error) {
    console.error('Error activating Hipobid integration:', error);
    return NextResponse.json(
      { error: 'Failed to activate Hipobid integration' },
      { status: 500 }
    );
  }
}
