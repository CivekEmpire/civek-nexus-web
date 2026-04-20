import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get Uttill integration and products
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get integration (if userId provided)
    let integration = null;
    if (userId) {
      const integrationResult = await pool.query(
        `SELECT * FROM uttill_integrations WHERE user_id = $1`,
        [userId]
      );
      integration = integrationResult.rows.length > 0 ? integrationResult.rows[0] : null;
    }

    // Get products
    let productQuery = `SELECT * FROM uttill_products WHERE is_available = TRUE`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category) {
      productQuery += ` AND category = $${paramIndex++}`;
      queryParams.push(category);
    }

    if (featured) {
      productQuery += ` AND is_featured = TRUE`;
    }

    productQuery += ` ORDER BY is_featured DESC, product_name ASC LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const productsResult = await pool.query(productQuery, queryParams);

    // Get user's orders if userId provided
    let orders = [];
    if (userId) {
      const ordersResult = await pool.query(
        `SELECT * FROM uttill_orders
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      );
      orders = ordersResult.rows;
    }

    return NextResponse.json({
      integration,
      products: productsResult.rows,
      recent_orders: orders,
      product_count: productsResult.rows.length
    });
  } catch (error) {
    console.error('Error fetching Uttill data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Uttill data' },
      { status: 500 }
    );
  }
}

// POST - Create or update integration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, preferences = {} } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO uttill_integrations (user_id, preferences, integration_status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (user_id) DO UPDATE
       SET preferences = $2, updated_at = NOW()
       RETURNING *`,
      [user_id, JSON.stringify(preferences)]
    );

    return NextResponse.json({
      success: true,
      integration: result.rows[0],
      message: 'Uttill integration activated'
    });
  } catch (error) {
    console.error('Error activating Uttill integration:', error);
    return NextResponse.json(
      { error: 'Failed to activate Uttill integration' },
      { status: 500 }
    );
  }
}
