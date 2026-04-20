import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - List spaces
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type'); // 'community', 'group', 'channel'
    const visibility = searchParams.get('visibility'); // 'public', 'private'
    const circleType = searchParams.get('circle_type');

    let query = `
      SELECT s.*,
             sm.role as user_role,
             sm.joined_at as user_joined_at
      FROM spaces s
      LEFT JOIN space_members sm ON s.id = sm.space_id AND sm.user_id = $1
    `;
    const params: any[] = [userId];
    const conditions: string[] = [];

    if (type) {
      params.push(type);
      conditions.push(`s.type = $${params.length}`);
    }

    if (visibility) {
      params.push(visibility);
      conditions.push(`s.visibility = $${params.length}`);
    }

    if (circleType) {
      params.push(circleType);
      conditions.push(`s.circle_type = $${params.length}`);
    }

    // Show spaces user is member of OR public spaces
    if (userId) {
      conditions.push(`(sm.user_id = $1 OR s.visibility = 'public')`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY s.updated_at DESC LIMIT 50`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      spaces: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching spaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spaces' },
      { status: 500 }
    );
  }
}

// POST - Create space
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      circle_type = 'shared',
      visibility = 'private',
      owner_id,
      description = '',
      settings = {}
    } = body;

    if (!name || !type || !owner_id) {
      return NextResponse.json(
        { error: 'name, type, and owner_id are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['community', 'group', 'channel'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be community, group, or channel' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create space
      const spaceResult = await client.query(
        `INSERT INTO spaces (name, type, circle_type, visibility, owner_id, description, settings)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, type, circle_type, visibility, owner_id, description, JSON.stringify(settings)]
      );

      const space = spaceResult.rows[0];

      // Add owner as member
      await client.query(
        `INSERT INTO space_members (space_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [space.id, owner_id]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        space,
        message: 'Space created successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating space:', error);
    return NextResponse.json(
      { error: 'Failed to create space' },
      { status: 500 }
    );
  }
}

// PUT - Update space
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      space_id,
      user_id,
      name,
      description,
      settings,
      visibility
    } = body;

    if (!space_id || !user_id) {
      return NextResponse.json(
        { error: 'space_id and user_id are required' },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const memberCheck = await pool.query(
      `SELECT role FROM space_members
       WHERE space_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')`,
      [space_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized. Must be owner or admin' },
        { status: 403 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [space_id];

    if (name) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description);
      updates.push(`description = $${params.length}`);
    }
    if (settings) {
      params.push(JSON.stringify(settings));
      updates.push(`settings = $${params.length}`);
    }
    if (visibility) {
      params.push(visibility);
      updates.push(`visibility = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE spaces SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params
    );

    return NextResponse.json({
      success: true,
      space: result.rows[0],
      message: 'Space updated successfully'
    });
  } catch (error) {
    console.error('Error updating space:', error);
    return NextResponse.json(
      { error: 'Failed to update space' },
      { status: 500 }
    );
  }
}
