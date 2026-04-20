import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST - Create order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      order_number,
      total_amount,
      currency = 'CRC',
      items = [],
      delivery_address = {},
      payment_method = 'credit_card'
    } = body;

    if (!user_id || !order_number || !total_amount || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO uttill_orders (
        user_id, order_number, total_amount, currency,
        items, delivery_address, payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [user_id, order_number, total_amount, currency,
       JSON.stringify(items), JSON.stringify(delivery_address), payment_method]
    );

    // Update loyalty points
    await pool.query(
      `SELECT calculate_uttill_loyalty_points($1)`,
      [user_id]
    );

    return NextResponse.json({
      success: true,
      order: result.rows[0],
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PUT - Update order status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { order_id, status, tracking_number } = body;

    if (!order_id || !status) {
      return NextResponse.json(
        { error: 'order_id and status are required' },
        { status: 400 }
      );
    }

    const updateFields: string[] = ['status = $2', 'updated_at = NOW()'];
    const params: any[] = [order_id, status];

    if (tracking_number) {
      updateFields.push('tracking_number = $3');
      params.push(tracking_number);
    }

    const result = await pool.query(
      `UPDATE uttill_orders
       SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.rows[0],
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
