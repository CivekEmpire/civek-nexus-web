import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get space members
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT
        sm.user_id,
        sm.role,
        sm.joined_at,
        u.name,
        u.email
       FROM space_members sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.space_id = $1
       ORDER BY
         CASE sm.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'moderator' THEN 3
           ELSE 4
         END,
         sm.joined_at ASC`,
      [params.id]
    );

    return NextResponse.json({
      members: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST - Add member (via invitation or join)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user_id, invited_by = null } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Check if space exists and get visibility
    const spaceResult = await pool.query(
      `SELECT visibility, type FROM spaces WHERE id = $1`,
      [params.id]
    );

    if (spaceResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Space not found' },
        { status: 404 }
      );
    }

    const { visibility } = spaceResult.rows[0];

    // For private spaces, need invitation
    if (visibility === 'private' || visibility === 'invite') {
      if (!invited_by) {
        return NextResponse.json(
          { error: 'Invitation required for private spaces' },
          { status: 403 }
        );
      }

      // Verify inviter is member
      const inviterCheck = await pool.query(
        `SELECT role FROM space_members WHERE space_id = $1 AND user_id = $2`,
        [params.id, invited_by]
      );

      if (inviterCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Inviter is not a member' },
          { status: 403 }
        );
      }
    }

    // Add member
    const result = await pool.query(
      `INSERT INTO space_members (space_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (space_id, user_id) DO NOTHING
       RETURNING *`,
      [params.id, user_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'User is already a member'
      });
    }

    return NextResponse.json({
      success: true,
      member: result.rows[0],
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// PUT - Update member role
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user_id, target_user_id, new_role } = body;

    if (!user_id || !target_user_id || !new_role) {
      return NextResponse.json(
        { error: 'user_id, target_user_id, and new_role are required' },
        { status: 400 }
      );
    }

    // Check if requester is owner or admin
    const requesterCheck = await pool.query(
      `SELECT role FROM space_members
       WHERE space_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')`,
      [params.id, user_id]
    );

    if (requesterCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized. Must be owner or admin' },
        { status: 403 }
      );
    }

    // Can't change owner role unless you're the owner
    if (new_role === 'owner' && requesterCheck.rows[0].role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can assign owner role' },
        { status: 403 }
      );
    }

    // Update role
    const result = await pool.query(
      `UPDATE space_members
       SET role = $1
       WHERE space_id = $2 AND user_id = $3
       RETURNING *`,
      [new_role, params.id, target_user_id]
    );

    return NextResponse.json({
      success: true,
      member: result.rows[0],
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const targetUserId = searchParams.get('target_user_id');

    if (!userId || !targetUserId) {
      return NextResponse.json(
        { error: 'user_id and target_user_id are required' },
        { status: 400 }
      );
    }

    // Allow if: user removing themselves OR user is admin/owner
    if (userId !== targetUserId) {
      const requesterCheck = await pool.query(
        `SELECT role FROM space_members
         WHERE space_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')`,
        [params.id, userId]
      );

      if (requesterCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    // Can't remove owner
    const targetCheck = await pool.query(
      `SELECT role FROM space_members WHERE space_id = $1 AND user_id = $2`,
      [params.id, targetUserId]
    );

    if (targetCheck.rows[0]?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove space owner' },
        { status: 403 }
      );
    }

    // Remove member
    await pool.query(
      `DELETE FROM space_members WHERE space_id = $1 AND user_id = $2`,
      [params.id, targetUserId]
    );

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
