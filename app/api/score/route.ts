import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET - Get user's Nexus Score
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
        user_id,
        trust_references,
        trust_verifications,
        trust_score,
        contrib_moderation_hours,
        contrib_help_actions,
        contrib_content_quality,
        contrib_score,
        reputation_feedback_positive,
        reputation_feedback_negative,
        reputation_deals_completed,
        reputation_score,
        impact_referrals,
        impact_deal_flow,
        impact_community_growth,
        impact_score,
        total_score,
        level,
        updated_at
       FROM nexus_score_components
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Initialize score if doesn't exist
      await pool.query(
        `INSERT INTO nexus_score_components (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      return NextResponse.json({
        user_id: userId,
        total_score: 0,
        level: 'explorador',
        components: {
          trust: { score: 0, weight: 0.30 },
          contribution: { score: 0, weight: 0.25 },
          reputation: { score: 0, weight: 0.25 },
          impact: { score: 0, weight: 0.20 }
        }
      });
    }

    const score = result.rows[0];

    return NextResponse.json({
      user_id: score.user_id,
      total_score: score.total_score,
      level: score.level,
      components: {
        trust: {
          score: parseFloat(score.trust_score),
          weight: 0.30,
          details: {
            references: score.trust_references,
            verifications: score.trust_verifications
          }
        },
        contribution: {
          score: parseFloat(score.contrib_score),
          weight: 0.25,
          details: {
            moderation_hours: score.contrib_moderation_hours,
            help_actions: score.contrib_help_actions,
            content_quality: score.contrib_content_quality
          }
        },
        reputation: {
          score: parseFloat(score.reputation_score),
          weight: 0.25,
          details: {
            positive: score.reputation_feedback_positive,
            negative: score.reputation_feedback_negative,
            deals_completed: score.reputation_deals_completed
          }
        },
        impact: {
          score: parseFloat(score.impact_score),
          weight: 0.20,
          details: {
            referrals: score.impact_referrals,
            deal_flow: score.impact_deal_flow,
            community_growth: score.impact_community_growth
          }
        }
      },
      updated_at: score.updated_at
    });
  } catch (error) {
    console.error('Error fetching score:', error);
    return NextResponse.json(
      { error: 'Failed to fetch score' },
      { status: 500 }
    );
  }
}

// POST - Update score component
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      component, // 'trust', 'contribution', 'reputation', 'impact'
      action,    // specific action taken
      value      // value to add/set
    } = body;

    if (!user_id || !component || !action) {
      return NextResponse.json(
        { error: 'user_id, component, and action are required' },
        { status: 400 }
      );
    }

    // Initialize if doesn't exist
    await pool.query(
      `INSERT INTO nexus_score_components (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user_id]
    );

    // Update based on action
    let updateQuery = '';
    let scoreChange = 0;

    switch (component) {
      case 'trust':
        if (action === 'reference_received') {
          updateQuery = `UPDATE nexus_score_components
            SET trust_references = trust_references + 1,
                trust_score = LEAST(100, trust_score + 5)
            WHERE user_id = $1`;
          scoreChange = 5;
        } else if (action === 'verification_completed') {
          updateQuery = `UPDATE nexus_score_components
            SET trust_verifications = trust_verifications + 1,
                trust_score = LEAST(100, trust_score + 10)
            WHERE user_id = $1`;
          scoreChange = 10;
        }
        break;

      case 'contribution':
        if (action === 'moderation') {
          updateQuery = `UPDATE nexus_score_components
            SET contrib_moderation_hours = contrib_moderation_hours + ${value || 1},
                contrib_score = LEAST(100, contrib_score + ${value || 2})
            WHERE user_id = $1`;
          scoreChange = value || 2;
        } else if (action === 'help') {
          updateQuery = `UPDATE nexus_score_components
            SET contrib_help_actions = contrib_help_actions + 1,
                contrib_score = LEAST(100, contrib_score + 3)
            WHERE user_id = $1`;
          scoreChange = 3;
        }
        break;

      case 'reputation':
        if (action === 'feedback_positive') {
          updateQuery = `UPDATE nexus_score_components
            SET reputation_feedback_positive = reputation_feedback_positive + 1,
                reputation_score = LEAST(100, reputation_score + 2)
            WHERE user_id = $1`;
          scoreChange = 2;
        } else if (action === 'deal_completed') {
          updateQuery = `UPDATE nexus_score_components
            SET reputation_deals_completed = reputation_deals_completed + 1,
                reputation_score = LEAST(100, reputation_score + 5)
            WHERE user_id = $1`;
          scoreChange = 5;
        }
        break;

      case 'impact':
        if (action === 'referral') {
          updateQuery = `UPDATE nexus_score_components
            SET impact_referrals = impact_referrals + 1,
                impact_score = LEAST(100, impact_score + 10)
            WHERE user_id = $1`;
          scoreChange = 10;
        } else if (action === 'deal_flow') {
          updateQuery = `UPDATE nexus_score_components
            SET impact_deal_flow = impact_deal_flow + 1,
                impact_score = LEAST(100, impact_score + 8)
            WHERE user_id = $1`;
          scoreChange = 8;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid component' },
          { status: 400 }
        );
    }

    if (!updateQuery) {
      return NextResponse.json(
        { error: 'Invalid action for component' },
        { status: 400 }
      );
    }

    await pool.query(updateQuery, [user_id]);

    // Log transaction
    await pool.query(
      `INSERT INTO score_transactions (user_id, component, points_change, reason)
       VALUES ($1, $2, $3, $4)`,
      [user_id, component, scoreChange, action]
    );

    // Get updated score
    const result = await pool.query(
      `SELECT total_score, level FROM nexus_score_components WHERE user_id = $1`,
      [user_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Score updated',
      total_score: result.rows[0].total_score,
      level: result.rows[0].level
    });
  } catch (error) {
    console.error('Error updating score:', error);
    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    );
  }
}
