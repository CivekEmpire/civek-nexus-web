import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get memorial profile(s)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testamentId = searchParams.get('testament_id');
    const memorialId = searchParams.get('memorial_id');
    const visibility = searchParams.get('visibility');

    if (!testamentId && !memorialId && !visibility) {
      return NextResponse.json(
        { error: 'testament_id, memorial_id, or visibility is required' },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];

    if (memorialId) {
      query = 'SELECT * FROM memorial_profiles WHERE id = $1';
      params = [memorialId];
    } else if (testamentId) {
      query = 'SELECT * FROM memorial_profiles WHERE testament_id = $1 ORDER BY created_at DESC';
      params = [testamentId];
    } else {
      // Public memorials
      query = 'SELECT * FROM memorial_profiles WHERE visibility = $1 AND status = $2 ORDER BY published_at DESC';
      params = [visibility, 'published'];
    }

    const result = await pool.query(query, params);

    if (memorialId && result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Memorial not found' },
        { status: 404 }
      );
    }

    // If single memorial, get tributes too
    if (memorialId && result.rows.length > 0) {
      const tributesResult = await pool.query(
        `SELECT * FROM memorial_tributes
         WHERE memorial_id = $1
         AND is_approved = TRUE
         ORDER BY created_at DESC
         LIMIT 50`,
        [memorialId]
      );

      return NextResponse.json({
        memorial: result.rows[0],
        tributes: tributesResult.rows
      });
    }

    return NextResponse.json({
      memorials: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching memorial:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memorial' },
      { status: 500 }
    );
  }
}

// POST - Create memorial profile
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      testament_id,
      profile_name,
      birth_date = null,
      passing_date = null,
      biography = '',
      life_achievements = [],
      photo_url = '',
      video_url = '',
      quotes = [],
      values = [],
      visibility = 'family',
      allow_tributes = true,
      allow_ai_interaction = false,
      metadata = {}
    } = body;

    if (!testament_id || !profile_name) {
      return NextResponse.json(
        { error: 'testament_id and profile_name are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO memorial_profiles (
        testament_id, profile_name, birth_date, passing_date,
        biography, life_achievements, photo_url, video_url,
        quotes, values, visibility, allow_tributes,
        allow_ai_interaction, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        testament_id, profile_name, birth_date, passing_date,
        biography, life_achievements, photo_url, video_url,
        quotes, values, visibility, allow_tributes,
        allow_ai_interaction, JSON.stringify(metadata)
      ]
    );

    // Log event
    await pool.query(
      `INSERT INTO legacy_activation_events (
        testament_id, event_type, description
      ) VALUES ($1, $2, $3)`,
      [testament_id, 'memorial_created', `Memorial profile created: ${profile_name}`]
    );

    return NextResponse.json({
      success: true,
      memorial: result.rows[0],
      message: 'Memorial profile created successfully'
    });
  } catch (error) {
    console.error('Error creating memorial:', error);
    return NextResponse.json(
      { error: 'Failed to create memorial' },
      { status: 500 }
    );
  }
}

// PUT - Update memorial or publish
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { memorial_id, ...updates } = body;

    if (!memorial_id) {
      return NextResponse.json(
        { error: 'memorial_id is required' },
        { status: 400 }
      );
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedUpdates = [
      'profile_name', 'birth_date', 'passing_date', 'biography',
      'life_achievements', 'photo_url', 'video_url', 'quotes',
      'values', 'visibility', 'allow_tributes', 'allow_ai_interaction',
      'metadata', 'status'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key) && value !== undefined) {
        if (['life_achievements', 'quotes', 'values'].includes(key)) {
          updateFields.push(`${key} = $${paramIndex++}`);
          params.push(value);
        } else if (key === 'metadata') {
          updateFields.push(`${key} = $${paramIndex++}`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
    }

    if (updates.status === 'published') {
      updateFields.push('published_at = NOW()');
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    params.push(memorial_id);
    const result = await pool.query(
      `UPDATE memorial_profiles
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Memorial not found' },
        { status: 404 }
      );
    }

    // Log if published
    if (updates.status === 'published') {
      await pool.query(
        `INSERT INTO legacy_activation_events (
          testament_id, event_type, description
        ) VALUES ($1, $2, $3)`,
        [result.rows[0].testament_id, 'memorial_published', `Memorial published: ${result.rows[0].profile_name}`]
      );
    }

    return NextResponse.json({
      success: true,
      memorial: result.rows[0],
      message: 'Memorial updated successfully'
    });
  } catch (error) {
    console.error('Error updating memorial:', error);
    return NextResponse.json(
      { error: 'Failed to update memorial' },
      { status: 500 }
    );
  }
}

// DELETE - Delete memorial
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memorialId = searchParams.get('memorial_id');

    if (!memorialId) {
      return NextResponse.json(
        { error: 'memorial_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM memorial_profiles WHERE id = $1 RETURNING testament_id`,
      [memorialId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Memorial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Memorial deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting memorial:', error);
    return NextResponse.json(
      { error: 'Failed to delete memorial' },
      { status: 500 }
    );
  }
}
