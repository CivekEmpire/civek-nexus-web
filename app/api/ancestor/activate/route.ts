import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST - Activate legacy for beneficiary
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      beneficiary_id,
      proof_of_death = false,
      verification_code = null,
      executor_approval = false
    } = body;

    if (!beneficiary_id) {
      return NextResponse.json(
        { error: 'beneficiary_id is required' },
        { status: 400 }
      );
    }

    // Get beneficiary details
    const beneficiaryResult = await pool.query(
      `SELECT * FROM testament_beneficiaries WHERE id = $1`,
      [beneficiary_id]
    );

    if (beneficiaryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    const beneficiary = beneficiaryResult.rows[0];

    // Check activation conditions
    const conditions = beneficiary.activation_conditions || {};

    if (conditions.require_proof_of_death && !proof_of_death) {
      return NextResponse.json(
        { error: 'Proof of death is required for activation' },
        { status: 400 }
      );
    }

    if (conditions.executor_approval && !executor_approval) {
      return NextResponse.json(
        { error: 'Executor approval is required for activation' },
        { status: 400 }
      );
    }

    // Call activation function
    const result = await pool.query(
      `SELECT activate_legacy_for_beneficiary($1, $2) as result`,
      [beneficiary_id, proof_of_death]
    );

    const activationResult = result.rows[0].result;

    if (!activationResult.success) {
      return NextResponse.json(
        { error: activationResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      activation_result: activationResult,
      message: 'Legacy activated successfully'
    });
  } catch (error) {
    console.error('Error activating legacy:', error);
    return NextResponse.json(
      { error: 'Failed to activate legacy' },
      { status: 500 }
    );
  }
}

// GET - Get activation status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const beneficiaryId = searchParams.get('beneficiary_id');

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: 'beneficiary_id is required' },
        { status: 400 }
      );
    }

    // Get beneficiary and activation status
    const beneficiaryResult = await pool.query(
      `SELECT * FROM testament_beneficiaries WHERE id = $1`,
      [beneficiaryId]
    );

    if (beneficiaryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    const beneficiary = beneficiaryResult.rows[0];

    // Get accessible vaults
    const vaultsResult = await pool.query(
      `SELECT * FROM testament_vaults WHERE id = ANY($1)`,
      [beneficiary.vaults_access]
    );

    // Get activation events
    const eventsResult = await pool.query(
      `SELECT * FROM legacy_activation_events
       WHERE affected_beneficiary_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [beneficiaryId]
    );

    return NextResponse.json({
      beneficiary,
      accessible_vaults: vaultsResult.rows,
      activation_events: eventsResult.rows,
      is_active: beneficiary.status === 'active'
    });
  } catch (error) {
    console.error('Error fetching activation status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activation status' },
      { status: 500 }
    );
  }
}

// PUT - Revoke delegation
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { beneficiary_id, reason = '' } = body;

    if (!beneficiary_id) {
      return NextResponse.json(
        { error: 'beneficiary_id is required' },
        { status: 400 }
      );
    }

    // Check if it's a delegated access
    const beneficiaryResult = await pool.query(
      `SELECT * FROM testament_beneficiaries WHERE id = $1`,
      [beneficiary_id]
    );

    if (beneficiaryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    const beneficiary = beneficiaryResult.rows[0];

    if (beneficiary.activation_mode !== 'delegado') {
      return NextResponse.json(
        { error: 'Can only revoke delegated access' },
        { status: 400 }
      );
    }

    // Revoke access
    await pool.query(
      `UPDATE testament_beneficiaries
       SET status = 'revoked'
       WHERE id = $1`,
      [beneficiary_id]
    );

    // Lock vaults again
    await pool.query(
      `UPDATE testament_vaults
       SET status = 'locked'
       WHERE id = ANY($1) AND status = 'unlocked'`,
      [beneficiary.vaults_access]
    );

    // Log event
    await pool.query(
      `INSERT INTO legacy_activation_events (
        testament_id, event_type, affected_beneficiary_id, description
      ) VALUES ($1, $2, $3, $4)`,
      [beneficiary.testament_id, 'delegation_revoked', beneficiary_id, reason || 'Delegation revoked']
    );

    return NextResponse.json({
      success: true,
      message: 'Delegation revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking delegation:', error);
    return NextResponse.json(
      { error: 'Failed to revoke delegation' },
      { status: 500 }
    );
  }
}
