import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - List marketplace agents
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'popular'; // 'popular', 'rating', 'newest'

    let query = `
      SELECT a.*,
             u.name as creator_name
      FROM marketplace_agents a
      JOIN users u ON a.creator_id = u.id
      WHERE a.status = 'approved' AND a.visibility = 'public'
    `;
    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND a.category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.name ILIKE $${params.length} OR a.description ILIKE $${params.length})`;
    }

    // Sorting
    if (sort === 'popular') {
      query += ` ORDER BY a.install_count DESC`;
    } else if (sort === 'rating') {
      query += ` ORDER BY a.rating_avg DESC, a.rating_count DESC`;
    } else if (sort === 'newest') {
      query += ` ORDER BY a.published_at DESC`;
    }

    query += ` LIMIT 50`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      agents: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST - Create agent
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      creator_id,
      name,
      description,
      category,
      pricing_model = 'free',
      price_amount = 0,
      prompt_template,
      system_instructions = '',
      tools = [],
      triggers = []
    } = body;

    if (!creator_id || !name || !description || !category || !prompt_template) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO marketplace_agents
        (creator_id, name, description, category, pricing_model, price_amount,
         prompt_template, system_instructions, tools, triggers, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
       RETURNING *`,
      [
        creator_id, name, description, category, pricing_model, price_amount,
        prompt_template, system_instructions,
        JSON.stringify(tools), JSON.stringify(triggers)
      ]
    );

    return NextResponse.json({
      success: true,
      agent: result.rows[0],
      message: 'Agent created. Submit for review to publish.'
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
