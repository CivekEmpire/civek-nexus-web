import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get ancestor AI instance
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testamentId = searchParams.get('testament_id');
    const aiId = searchParams.get('ai_id');
    const beneficiaryId = searchParams.get('beneficiary_id');

    if (!testamentId && !aiId) {
      return NextResponse.json(
        { error: 'testament_id or ai_id is required' },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];

    if (aiId) {
      query = 'SELECT * FROM ancestor_ai_instances WHERE id = $1';
      params = [aiId];
    } else {
      query = 'SELECT * FROM ancestor_ai_instances WHERE testament_id = $1 ORDER BY created_at DESC LIMIT 1';
      params = [testamentId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json({
        ancestor_ai: null,
        message: 'No ancestor AI configured'
      });
    }

    const ancestorAI = result.rows[0];

    // Check if beneficiary has access
    if (beneficiaryId) {
      const hasAccess = ancestorAI.active_for_beneficiaries.includes(beneficiaryId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Beneficiary does not have access to this ancestor AI' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ancestor_ai: ancestorAI
    });
  } catch (error) {
    console.error('Error fetching ancestor AI:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ancestor AI' },
      { status: 500 }
    );
  }
}

// POST - Create or update ancestor AI instance
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      testament_id,
      ancestor_name,
      training_data_source = {},
      personality_profile = {},
      knowledge_base = {},
      active_for_beneficiaries = [],
      conversation_limits = {},
      model_version = 'claude-opus-4.6'
    } = body;

    if (!testament_id || !ancestor_name) {
      return NextResponse.json(
        { error: 'testament_id and ancestor_name are required' },
        { status: 400 }
      );
    }

    // Check if AI already exists for this testament
    const existingAI = await pool.query(
      `SELECT id FROM ancestor_ai_instances WHERE testament_id = $1 LIMIT 1`,
      [testament_id]
    );

    let result;
    if (existingAI.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE ancestor_ai_instances
         SET ancestor_name = $2,
             training_data_source = $3,
             personality_profile = $4,
             knowledge_base = $5,
             active_for_beneficiaries = $6,
             conversation_limits = $7,
             model_version = $8,
             status = 'training'
         WHERE id = $1
         RETURNING *`,
        [
          existingAI.rows[0].id,
          ancestor_name,
          JSON.stringify(training_data_source),
          JSON.stringify(personality_profile),
          JSON.stringify(knowledge_base),
          active_for_beneficiaries,
          JSON.stringify(conversation_limits),
          model_version
        ]
      );
    } else {
      // Create new
      result = await pool.query(
        `INSERT INTO ancestor_ai_instances (
          testament_id, ancestor_name, training_data_source,
          personality_profile, knowledge_base, active_for_beneficiaries,
          conversation_limits, model_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          testament_id,
          ancestor_name,
          JSON.stringify(training_data_source),
          JSON.stringify(personality_profile),
          JSON.stringify(knowledge_base),
          active_for_beneficiaries,
          JSON.stringify(conversation_limits),
          model_version
        ]
      );
    }

    // Log event
    await pool.query(
      `INSERT INTO legacy_activation_events (
        testament_id, event_type, description
      ) VALUES ($1, $2, $3)`,
      [testament_id, 'ai_created', `Ancestor AI created/updated: ${ancestor_name}`]
    );

    return NextResponse.json({
      success: true,
      ancestor_ai: result.rows[0],
      message: 'Ancestor AI saved successfully'
    });
  } catch (error) {
    console.error('Error saving ancestor AI:', error);
    return NextResponse.json(
      { error: 'Failed to save ancestor AI' },
      { status: 500 }
    );
  }
}

// PUT - Activate ancestor AI
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { ai_id, status } = body;

    if (!ai_id || !status) {
      return NextResponse.json(
        { error: 'ai_id and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['training', 'ready', 'active', 'paused', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updateFields: string[] = [`status = $2`];
    const params: any[] = [ai_id, status];

    if (status === 'active') {
      updateFields.push('activated_at = NOW()');
    }

    const result = await pool.query(
      `UPDATE ancestor_ai_instances
       SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ancestor AI not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ancestor_ai: result.rows[0],
      message: `Ancestor AI status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating ancestor AI status:', error);
    return NextResponse.json(
      { error: 'Failed to update ancestor AI status' },
      { status: 500 }
    );
  }
}
