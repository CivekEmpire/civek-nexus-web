import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// POST - Chat with ancestor AI
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      ancestor_ai_id,
      beneficiary_id,
      message,
      thread_id = null
    } = body;

    if (!ancestor_ai_id || !beneficiary_id || !message) {
      return NextResponse.json(
        { error: 'ancestor_ai_id, beneficiary_id, and message are required' },
        { status: 400 }
      );
    }

    // Get ancestor AI instance
    const aiResult = await pool.query(
      `SELECT * FROM ancestor_ai_instances WHERE id = $1 AND status = 'active'`,
      [ancestor_ai_id]
    );

    if (aiResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ancestor AI not found or not active' },
        { status: 404 }
      );
    }

    const ancestorAI = aiResult.rows[0];

    // Check beneficiary access
    if (!ancestorAI.active_for_beneficiaries.includes(beneficiary_id)) {
      return NextResponse.json(
        { error: 'Beneficiary does not have access to this ancestor AI' },
        { status: 403 }
      );
    }

    // Get beneficiary details
    const beneficiaryResult = await pool.query(
      `SELECT * FROM testament_beneficiaries WHERE id = $1`,
      [beneficiary_id]
    );

    if (beneficiaryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    const beneficiary = beneficiaryResult.rows[0];

    // Check access level (interaction or higher)
    if (!['interaction', 'fusion', 'succession'].includes(beneficiary.access_level)) {
      return NextResponse.json(
        { error: 'Beneficiary access level does not permit conversation' },
        { status: 403 }
      );
    }

    // Generate thread_id if not provided
    const conversationThreadId = thread_id || crypto.randomUUID();

    // Log user message
    await pool.query(
      `SELECT log_ancestor_conversation($1, $2, $3, $4, $5, $6)`,
      [ancestor_ai_id, beneficiary_id, conversationThreadId, 'user', message, JSON.stringify({})]
    );

    // Generate ancestor response (simplified - in production, call actual AI)
    const ancestorResponse = await generateAncestorResponse(
      ancestorAI,
      beneficiary,
      message,
      conversationThreadId
    );

    // Log ancestor response
    await pool.query(
      `SELECT log_ancestor_conversation($1, $2, $3, $4, $5, $6)`,
      [
        ancestor_ai_id,
        beneficiary_id,
        conversationThreadId,
        'ancestor',
        ancestorResponse.content,
        JSON.stringify(ancestorResponse.metadata)
      ]
    );

    return NextResponse.json({
      success: true,
      thread_id: conversationThreadId,
      response: ancestorResponse.content,
      metadata: ancestorResponse.metadata
    });
  } catch (error) {
    console.error('Error in ancestor chat:', error);
    return NextResponse.json(
      { error: 'Failed to process ancestor chat' },
      { status: 500 }
    );
  }
}

// GET - Get conversation history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('thread_id');
    const beneficiaryId = searchParams.get('beneficiary_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!threadId && !beneficiaryId) {
      return NextResponse.json(
        { error: 'thread_id or beneficiary_id is required' },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];

    if (threadId) {
      query = `SELECT * FROM ancestor_conversations
               WHERE conversation_thread_id = $1
               ORDER BY created_at ASC
               LIMIT $2`;
      params = [threadId, limit];
    } else {
      query = `SELECT * FROM ancestor_conversations
               WHERE beneficiary_id = $1
               ORDER BY created_at DESC
               LIMIT $2`;
      params = [beneficiaryId, limit];
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      conversations: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// Helper function to generate ancestor response
// In production, this would call Claude API with ancestor's personality
async function generateAncestorResponse(
  ancestorAI: any,
  beneficiary: any,
  userMessage: string,
  threadId: string
): Promise<{ content: string; metadata: any }> {
  // Get conversation history for context
  const historyResult = await pool.query(
    `SELECT message_role, message_content
     FROM ancestor_conversations
     WHERE conversation_thread_id = $1
     ORDER BY created_at ASC
     LIMIT 20`,
    [threadId]
  );

  const conversationHistory = historyResult.rows;

  // Build system prompt from ancestor's personality and knowledge
  const systemPrompt = `You are ${ancestorAI.ancestor_name}, speaking with ${beneficiary.beneficiary_name} (your ${beneficiary.relationship}).

Personality traits: ${JSON.stringify(ancestorAI.personality_profile)}

Your knowledge base includes:
${JSON.stringify(ancestorAI.knowledge_base)}

Speak as yourself, with your personality, wisdom, and values. Draw from your knowledge and experiences.
Remember that you are helping guide your heir, sharing wisdom accumulated over a lifetime.`;

  // In production, call actual AI API (Claude, GPT, etc)
  // For now, return a placeholder response
  const response = {
    content: `[ANCESTOR AI RESPONSE PLACEHOLDER]

This is where ${ancestorAI.ancestor_name} would respond to: "${userMessage}"

In production, this would call the configured AI model (${ancestorAI.model_version}) with:
- System prompt: ${ancestorAI.ancestor_name}'s personality and wisdom
- Context: Conversation history
- User message: ${userMessage}

The AI would generate a response drawing from the ancestor's knowledge base and personality profile.`,
    metadata: {
      model_used: ancestorAI.model_version,
      emotion: 'thoughtful',
      wisdom_shared: true,
      production_ready: false
    }
  };

  return response;
}
