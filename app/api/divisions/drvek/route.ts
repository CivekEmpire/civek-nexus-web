import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get Dr.Vek integration and health data
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
      `SELECT * FROM drvek_integrations WHERE user_id = $1`,
      [userId]
    );

    // Get recent health records
    const recordsResult = await pool.query(
      `SELECT * FROM drvek_health_records
       WHERE user_id = $1
       ORDER BY record_date DESC, created_at DESC
       LIMIT 20`,
      [userId]
    );

    // Get active wellness plans
    const plansResult = await pool.query(
      `SELECT * FROM drvek_wellness_plans
       WHERE user_id = $1 AND status = 'active'
       ORDER BY start_date DESC`,
      [userId]
    );

    // Get active reminders
    const remindersResult = await pool.query(
      `SELECT * FROM drvek_reminders
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY reminder_time`,
      [userId]
    );

    return NextResponse.json({
      integration: integrationResult.rows.length > 0 ? integrationResult.rows[0] : null,
      recent_records: recordsResult.rows,
      active_plans: plansResult.rows,
      reminders: remindersResult.rows
    });
  } catch (error) {
    console.error('Error fetching Dr.Vek data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Dr.Vek data' },
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
      health_profile = {},
      privacy_settings = {}
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO drvek_integrations (
        user_id, health_profile, privacy_settings, integration_status
      ) VALUES ($1, $2, $3, 'active')
      ON CONFLICT (user_id) DO UPDATE
      SET health_profile = $2, privacy_settings = $3, updated_at = NOW()
      RETURNING *`,
      [user_id, JSON.stringify(health_profile), JSON.stringify(privacy_settings)]
    );

    return NextResponse.json({
      success: true,
      integration: result.rows[0],
      message: 'Dr.Vek integration activated'
    });
  } catch (error) {
    console.error('Error activating Dr.Vek integration:', error);
    return NextResponse.json(
      { error: 'Failed to activate Dr.Vek integration' },
      { status: 500 }
    );
  }
}
