import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get beneficiaries
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testamentId = searchParams.get('testament_id');
    const beneficiaryId = searchParams.get('beneficiary_id');

    if (!testamentId && !beneficiaryId) {
      return NextResponse.json(
        { error: 'testament_id or beneficiary_id is required' },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];

    if (beneficiaryId) {
      query = 'SELECT * FROM testament_beneficiaries WHERE id = $1';
      params = [beneficiaryId];
    } else {
      query = 'SELECT * FROM testament_beneficiaries WHERE testament_id = $1 ORDER BY priority, created_at';
      params = [testamentId];
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      beneficiaries: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching beneficiaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beneficiaries' },
      { status: 500 }
    );
  }
}

// POST - Add beneficiary
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      testament_id,
      beneficiary_user_id = null,
      beneficiary_email = '',
      beneficiary_name,
      relationship,
      access_level,
      vaults_access = [],
      activation_mode,
      delegation_expires_at = null,
      activation_conditions = {},
      priority = 1
    } = body;

    if (!testament_id || !beneficiary_name || !relationship || !access_level || !activation_mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate access_level
    const validAccessLevels = ['consultation', 'interaction', 'fusion', 'succession'];
    if (!validAccessLevels.includes(access_level)) {
      return NextResponse.json(
        { error: `Invalid access_level. Must be one of: ${validAccessLevels.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate activation_mode
    const validModes = ['vida', 'delegado', 'legado', 'emergencia'];
    if (!validModes.includes(activation_mode)) {
      return NextResponse.json(
        { error: `Invalid activation_mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO testament_beneficiaries (
        testament_id, beneficiary_user_id, beneficiary_email,
        beneficiary_name, relationship, access_level,
        vaults_access, activation_mode, delegation_expires_at,
        activation_conditions, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        testament_id, beneficiary_user_id, beneficiary_email,
        beneficiary_name, relationship, access_level,
        vaults_access, activation_mode, delegation_expires_at,
        JSON.stringify(activation_conditions), priority
      ]
    );

    // Log event
    await pool.query(
      `INSERT INTO legacy_activation_events (
        testament_id, event_type, affected_beneficiary_id, description
      ) VALUES ($1, $2, $3, $4)`,
      [testament_id, 'beneficiary_added', result.rows[0].id, `Beneficiary added: ${beneficiary_name}`]
    );

    // Auto-activate if mode is 'vida'
    if (activation_mode === 'vida') {
      await pool.query(
        `SELECT activate_legacy_for_beneficiary($1, FALSE)`,
        [result.rows[0].id]
      );
    }

    return NextResponse.json({
      success: true,
      beneficiary: result.rows[0],
      message: 'Beneficiary added successfully'
    });
  } catch (error) {
    console.error('Error adding beneficiary:', error);
    return NextResponse.json(
      { error: 'Failed to add beneficiary' },
      { status: 500 }
    );
  }
}

// PUT - Update beneficiary
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      beneficiary_id,
      beneficiary_name,
      relationship,
      access_level,
      vaults_access,
      activation_mode,
      delegation_expires_at,
      activation_conditions,
      priority,
      status
    } = body;

    if (!beneficiary_id) {
      return NextResponse.json(
        { error: 'beneficiary_id is required' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (beneficiary_name !== undefined) {
      updates.push(`beneficiary_name = $${paramIndex++}`);
      params.push(beneficiary_name);
    }
    if (relationship !== undefined) {
      updates.push(`relationship = $${paramIndex++}`);
      params.push(relationship);
    }
    if (access_level !== undefined) {
      updates.push(`access_level = $${paramIndex++}`);
      params.push(access_level);
    }
    if (vaults_access !== undefined) {
      updates.push(`vaults_access = $${paramIndex++}`);
      params.push(vaults_access);
    }
    if (activation_mode !== undefined) {
      updates.push(`activation_mode = $${paramIndex++}`);
      params.push(activation_mode);
    }
    if (delegation_expires_at !== undefined) {
      updates.push(`delegation_expires_at = $${paramIndex++}`);
      params.push(delegation_expires_at);
    }
    if (activation_conditions !== undefined) {
      updates.push(`activation_conditions = $${paramIndex++}`);
      params.push(JSON.stringify(activation_conditions));
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);

      if (status === 'active') {
        updates.push(`activated_at = NOW()`);
      }
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(beneficiary_id);
    const result = await pool.query(
      `UPDATE testament_beneficiaries
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      beneficiary: result.rows[0],
      message: 'Beneficiary updated successfully'
    });
  } catch (error) {
    console.error('Error updating beneficiary:', error);
    return NextResponse.json(
      { error: 'Failed to update beneficiary' },
      { status: 500 }
    );
  }
}

// DELETE - Remove beneficiary
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const beneficiaryId = searchParams.get('beneficiary_id');

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: 'beneficiary_id is required' },
        { status: 400 }
      );
    }

    // Check if beneficiary is already active
    const checkResult = await pool.query(
      `SELECT status FROM testament_beneficiaries WHERE id = $1`,
      [beneficiaryId]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete active beneficiary. Revoke first.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM testament_beneficiaries WHERE id = $1 RETURNING testament_id`,
      [beneficiaryId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Beneficiary removed successfully'
    });
  } catch (error) {
    console.error('Error removing beneficiary:', error);
    return NextResponse.json(
      { error: 'Failed to remove beneficiary' },
      { status: 500 }
    );
  }
}
