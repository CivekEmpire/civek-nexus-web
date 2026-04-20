import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - List elite events
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const upcoming = searchParams.get('upcoming') === 'true';

    // Verify elite membership
    const eliteCheck = await pool.query(
      `SELECT is_elite_member($1) as is_elite`,
      [userId]
    );

    if (!eliteCheck.rows[0].is_elite) {
      return NextResponse.json(
        { error: 'Elite membership required' },
        { status: 403 }
      );
    }

    let query = `
      SELECT e.*,
             r.status as rsvp_status,
             (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attendee_count
      FROM elite_events e
      LEFT JOIN event_rsvps r ON e.id = r.event_id AND r.user_id = $1
      WHERE e.status != 'cancelled'
    `;
    const params: any[] = [userId];

    if (upcoming) {
      query += ` AND e.start_time > NOW()`;
    }

    query += ` ORDER BY e.start_time ASC LIMIT 50`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      events: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST - RSVP to event
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      event_id,
      user_id,
      status,
      plus_one = false,
      dietary_restrictions = '',
      notes = ''
    } = body;

    if (!event_id || !user_id || !status) {
      return NextResponse.json(
        { error: 'event_id, user_id, and status are required' },
        { status: 400 }
      );
    }

    // Verify elite membership
    const eliteCheck = await pool.query(
      `SELECT is_elite_member($1) as is_elite`,
      [user_id]
    );

    if (!eliteCheck.rows[0].is_elite) {
      return NextResponse.json(
        { error: 'Elite membership required' },
        { status: 403 }
      );
    }

    // Check capacity
    if (status === 'attending') {
      const capacityCheck = await pool.query(
        `SELECT
          e.capacity,
          (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as current_count
         FROM elite_events e
         WHERE e.id = $1`,
        [event_id]
      );

      if (capacityCheck.rows.length > 0) {
        const { capacity, current_count } = capacityCheck.rows[0];
        if (capacity && current_count >= capacity) {
          return NextResponse.json(
            { error: 'Event is at full capacity' },
            { status: 400 }
          );
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO event_rsvps (event_id, user_id, status, plus_one, dietary_restrictions, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id, user_id) DO UPDATE
       SET status = $3, plus_one = $4, dietary_restrictions = $5, notes = $6, updated_at = NOW()
       RETURNING *`,
      [event_id, user_id, status, plus_one, dietary_restrictions, notes]
    );

    return NextResponse.json({
      success: true,
      rsvp: result.rows[0],
      message: 'RSVP updated successfully'
    });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    return NextResponse.json(
      { error: 'Failed to update RSVP' },
      { status: 500 }
    );
  }
}
