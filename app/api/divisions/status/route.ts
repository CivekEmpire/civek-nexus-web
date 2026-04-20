import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get all division integrations status for a user
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

    // Use the function to get all statuses
    const statusResult = await pool.query(
      `SELECT get_user_divisions_status($1) as divisions_status`,
      [userId]
    );

    const divisionsStatus = statusResult.rows[0].divisions_status;

    // Get detailed stats for each active division
    const stats: any = {
      divisions_status: divisionsStatus,
      details: {}
    };

    // Hipobid stats
    if (divisionsStatus.hipobid === 'active') {
      const hipobidStats = await pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'open') as open_tenders,
          COUNT(*) FILTER (WHERE user_bid_status = 'submitted') as submitted_bids,
          COUNT(*) FILTER (WHERE user_bid_status = 'won') as won_bids
         FROM hipobid_tenders
         WHERE user_id = $1`,
        [userId]
      );
      stats.details.hipobid = hipobidStats.rows[0];
    }

    // Uttill stats
    if (divisionsStatus.uttill === 'active') {
      const uttillStats = await pool.query(
        `SELECT
          loyalty_points,
          discount_tier,
          (SELECT COUNT(*) FROM uttill_orders WHERE user_id = $1) as total_orders,
          (SELECT COUNT(*) FROM uttill_orders WHERE user_id = $1 AND status = 'delivered') as completed_orders
         FROM uttill_integrations
         WHERE user_id = $1`,
        [userId]
      );
      stats.details.uttill = uttillStats.rows.length > 0 ? uttillStats.rows[0] : null;
    }

    // Distribeaute stats
    if (divisionsStatus.distribeaute === 'active') {
      const distribeauteStats = await pool.query(
        `SELECT
          distributor_level,
          downline_count,
          current_month_sales,
          commission_earned,
          commission_pending,
          rank_achieved
         FROM distribeaute_integrations
         WHERE user_id = $1`,
        [userId]
      );
      stats.details.distribeaute = distribeauteStats.rows.length > 0 ? distribeauteStats.rows[0] : null;
    }

    // Dr.Vek stats
    if (divisionsStatus.drvek === 'active') {
      const drvekStats = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM drvek_health_records WHERE user_id = $1) as total_records,
          (SELECT COUNT(*) FROM drvek_wellness_plans WHERE user_id = $1 AND status = 'active') as active_plans,
          (SELECT COUNT(*) FROM drvek_reminders WHERE user_id = $1 AND is_active = TRUE) as active_reminders
         FROM drvek_integrations
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );
      stats.details.drvek = drvekStats.rows.length > 0 ? drvekStats.rows[0] : null;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching divisions status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch divisions status' },
      { status: 500 }
    );
  }
}
