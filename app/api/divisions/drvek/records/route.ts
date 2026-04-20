import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST - Add health record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      record_type,
      record_date,
      title,
      description = '',
      practitioner_name = '',
      measurements = {},
      prescriptions = [],
      notes = ''
    } = body;

    if (!user_id || !record_type || !record_date || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO drvek_health_records (
        user_id, record_type, record_date, title, description,
        practitioner_name, measurements, prescriptions, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [user_id, record_type, record_date, title, description,
       practitioner_name, JSON.stringify(measurements), JSON.stringify(prescriptions), notes]
    );

    return NextResponse.json({
      success: true,
      record: result.rows[0],
      message: 'Health record added successfully'
    });
  } catch (error) {
    console.error('Error adding health record:', error);
    return NextResponse.json(
      { error: 'Failed to add health record' },
      { status: 500 }
    );
  }
}
