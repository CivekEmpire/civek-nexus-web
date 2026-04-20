import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get testament with full details (vaults + beneficiaries)
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

    // Get testament
    const testamentResult = await pool.query(
      `SELECT * FROM digital_testaments WHERE user_id = $1`,
      [userId]
    );

    if (testamentResult.rows.length === 0) {
      return NextResponse.json({
        testament: null,
        vaults: [],
        beneficiaries: [],
        ancestor_ai: null,
        message: 'No testament configured'
      });
    }

    const testament = testamentResult.rows[0];

    // Get vaults
    const vaultsResult = await pool.query(
      `SELECT * FROM testament_vaults
       WHERE testament_id = $1
       ORDER BY vault_dimension, created_at`,
      [userId]
    );

    // Get beneficiaries
    const beneficiariesResult = await pool.query(
      `SELECT * FROM testament_beneficiaries
       WHERE testament_id = $1
       ORDER BY priority, created_at`,
      [userId]
    );

    // Get ancestor AI
    const aiResult = await pool.query(
      `SELECT * FROM ancestor_ai_instances
       WHERE testament_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    return NextResponse.json({
      testament,
      vaults: vaultsResult.rows,
      beneficiaries: beneficiariesResult.rows,
      ancestor_ai: aiResult.rows.length > 0 ? aiResult.rows[0] : null
    });
  } catch (error) {
    console.error('Error fetching testament:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testament' },
      { status: 500 }
    );
  }
}

// POST - Create or update testament
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      heirs = [],
      instructions = '',
      trigger_conditions = {
        inactivity_days: 180,
        require_proof_of_death: true,
        executor_user_ids: []
      }
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO digital_testaments (user_id, heirs, instructions, trigger_conditions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
       SET heirs = $2, instructions = $3, trigger_conditions = $4, updated_at = NOW()
       RETURNING *`,
      [user_id, JSON.stringify(heirs), instructions, JSON.stringify(trigger_conditions)]
    );

    // Log event
    await pool.query(
      `INSERT INTO legacy_activation_events (testament_id, event_type, triggered_by, description)
       VALUES ($1, $2, $3, $4)`,
      [user_id, result.rows.length === 1 ? 'testament_created' : 'testament_updated', user_id, 'Testament configuration saved']
    );

    return NextResponse.json({
      success: true,
      testament: result.rows[0],
      message: 'Testament saved successfully'
    });
  } catch (error) {
    console.error('Error saving testament:', error);
    return NextResponse.json(
      { error: 'Failed to save testament' },
      { status: 500 }
    );
  }
}

// DELETE - Delete testament (with safeguards)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const confirmCode = searchParams.get('confirm');

    if (!userId || confirmCode !== 'DELETE_TESTAMENT') {
      return NextResponse.json(
        { error: 'Invalid deletion request. Confirmation code required.' },
        { status: 400 }
      );
    }

    // Check for active beneficiaries
    const activeCheck = await pool.query(
      `SELECT COUNT(*) as count FROM testament_beneficiaries
       WHERE testament_id = $1 AND status = 'active'`,
      [userId]
    );

    if (parseInt(activeCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete testament with active beneficiaries' },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM digital_testaments WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Testament deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting testament:', error);
    return NextResponse.json(
      { error: 'Failed to delete testament' },
      { status: 500 }
    );
  }
}
