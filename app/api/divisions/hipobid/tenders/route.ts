import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' : { rejectUnauthorized: false } : false
});

// POST - Add tender
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      tender_title,
      tender_description = '',
      tender_category,
      country,
      organization,
      budget_amount,
      submission_deadline,
      documents_url = ''
    } = body;

    if (!user_id || !tender_title || !submission_deadline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO hipobid_tenders (
        user_id, tender_title, tender_description, tender_category,
        country, organization, budget_amount, submission_deadline, documents_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [user_id, tender_title, tender_description, tender_category,
       country, organization, budget_amount, submission_deadline, documents_url]
    );

    // Create notification
    await pool.query(
      `INSERT INTO hipobid_notifications (user_id, tender_id, notification_type, message)
       VALUES ($1, $2, $3, $4)`,
      [user_id, result.rows[0].id, 'new_tender', `Nueva licitación: ${tender_title}`]
    );

    return NextResponse.json({
      success: true,
      tender: result.rows[0],
      message: 'Tender added successfully'
    });
  } catch (error) {
    console.error('Error adding tender:', error);
    return NextResponse.json(
      { error: 'Failed to add tender' },
      { status: 500 }
    );
  }
}

// PUT - Update tender bid status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tender_id, user_bid_status, user_bid_amount } = body;

    if (!tender_id || !user_bid_status) {
      return NextResponse.json(
        { error: 'tender_id and user_bid_status are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE hipobid_tenders
       SET user_bid_status = $2, user_bid_amount = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [tender_id, user_bid_status, user_bid_amount]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tender: result.rows[0],
      message: 'Tender updated successfully'
    });
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json(
      { error: 'Failed to update tender' },
      { status: 500 }
    );
  }
}
