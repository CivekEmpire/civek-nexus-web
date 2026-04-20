import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get vaults (by testament or vault ID)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testamentId = searchParams.get('testament_id');
    const vaultId = searchParams.get('vault_id');
    const dimension = searchParams.get('dimension');

    if (!testamentId && !vaultId) {
      return NextResponse.json(
        { error: 'testament_id or vault_id is required' },
        { status: 400 }
      );
    }

    let query = 'SELECT * FROM testament_vaults WHERE ';
    let params: any[] = [];

    if (vaultId) {
      query += 'id = $1';
      params = [vaultId];
    } else {
      query += 'testament_id = $1';
      params = [testamentId];

      if (dimension) {
        query += ' AND vault_dimension = $2';
        params.push(dimension);
      }

      query += ' ORDER BY vault_dimension, created_at';
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      vaults: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching vaults:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vaults' },
      { status: 500 }
    );
  }
}

// POST - Create vault
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      testament_id,
      vault_dimension,
      vault_name,
      description = '',
      content_type,
      content_encrypted = '',
      content_metadata = {},
      natural_heir = '',
      access_restrictions = {}
    } = body;

    if (!testament_id || !vault_dimension || !vault_name || !content_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dimension
    const validDimensions = ['civek_os', 'dr_vek', 'uttill', 'hipobid', 'nexus', 'family'];
    if (!validDimensions.includes(vault_dimension)) {
      return NextResponse.json(
        { error: `Invalid vault_dimension. Must be one of: ${validDimensions.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO testament_vaults (
        testament_id, vault_dimension, vault_name, description,
        content_type, content_encrypted, content_metadata,
        natural_heir, access_restrictions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        testament_id, vault_dimension, vault_name, description,
        content_type, content_encrypted, JSON.stringify(content_metadata),
        natural_heir, JSON.stringify(access_restrictions)
      ]
    );

    // Log event
    await pool.query(
      `INSERT INTO legacy_activation_events (
        testament_id, event_type, affected_vault_id, description
      ) VALUES ($1, $2, $3, $4)`,
      [testament_id, 'vault_created', result.rows[0].id, `Vault created: ${vault_name}`]
    );

    return NextResponse.json({
      success: true,
      vault: result.rows[0],
      message: 'Vault created successfully'
    });
  } catch (error) {
    console.error('Error creating vault:', error);
    return NextResponse.json(
      { error: 'Failed to create vault' },
      { status: 500 }
    );
  }
}

// PUT - Update vault
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      vault_id,
      vault_name,
      description,
      content_encrypted,
      content_metadata,
      natural_heir,
      access_restrictions,
      status
    } = body;

    if (!vault_id) {
      return NextResponse.json(
        { error: 'vault_id is required' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (vault_name !== undefined) {
      updates.push(`vault_name = $${paramIndex++}`);
      params.push(vault_name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (content_encrypted !== undefined) {
      updates.push(`content_encrypted = $${paramIndex++}`);
      params.push(content_encrypted);
    }
    if (content_metadata !== undefined) {
      updates.push(`content_metadata = $${paramIndex++}`);
      params.push(JSON.stringify(content_metadata));
    }
    if (natural_heir !== undefined) {
      updates.push(`natural_heir = $${paramIndex++}`);
      params.push(natural_heir);
    }
    if (access_restrictions !== undefined) {
      updates.push(`access_restrictions = $${paramIndex++}`);
      params.push(JSON.stringify(access_restrictions));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);

      if (status === 'unlocked') {
        updates.push(`unlocked_at = NOW()`);
      } else if (status === 'inherited') {
        updates.push(`inherited_at = NOW()`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(vault_id);
    const result = await pool.query(
      `UPDATE testament_vaults
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vault not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vault: result.rows[0],
      message: 'Vault updated successfully'
    });
  } catch (error) {
    console.error('Error updating vault:', error);
    return NextResponse.json(
      { error: 'Failed to update vault' },
      { status: 500 }
    );
  }
}

// DELETE - Delete vault
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultId = searchParams.get('vault_id');

    if (!vaultId) {
      return NextResponse.json(
        { error: 'vault_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM testament_vaults WHERE id = $1 RETURNING testament_id`,
      [vaultId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vault not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vault deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vault:', error);
    return NextResponse.json(
      { error: 'Failed to delete vault' },
      { status: 500 }
    );
  }
}
