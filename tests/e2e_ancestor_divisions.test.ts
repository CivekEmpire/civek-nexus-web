/**
 * E2E Tests - ANCESTOR PROTOCOL + Division Integrations
 * Session #070 - CIVEK NEXUS
 * Tests: Sprint 22 (ANCESTOR) + Sprint 19 (Divisions)
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test user ID (use demo user from previous migrations)
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function logTest(test: string, status: 'PASS' | 'FAIL', details?: string, error?: string) {
  results.push({ test, status, details, error });
  const symbol = status === 'PASS' ? '✅' : '❌';
  console.log(`${symbol} ${test}: ${status}${details ? ' - ' + details : ''}`);
  if (error) console.error(`   Error: ${error}`);
}

// ============================================================================
// ANCESTOR PROTOCOL TESTS
// ============================================================================

async function testAncestorProtocol() {
  console.log('\n🧪 ANCESTOR PROTOCOL TESTS\n');

  try {
    // Test 1: Create Testament
    console.log('Test 1: Create testament...');
    const testamentResult = await pool.query(
      `INSERT INTO digital_testaments (user_id, instructions)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
       SET instructions = $2, updated_at = NOW()
       RETURNING *`,
      [TEST_USER_ID, 'E2E Test Testament - Session #070']
    );

    if (testamentResult.rows.length > 0) {
      logTest('Create Testament', 'PASS', `Testament ID: ${testamentResult.rows[0].user_id}`);
    } else {
      logTest('Create Testament', 'FAIL', 'No rows returned');
    }

    // Test 2: Create Testament Vaults (3 dimensions)
    console.log('Test 2: Create testament vaults...');
    const vaultsToCreate = [
      { dimension: 'civek_os', name: 'CIVEK OS Architecture', type: 'code' },
      { dimension: 'family', name: 'Family Memories', type: 'media' },
      { dimension: 'nexus', name: 'NEXUS Network', type: 'contacts' }
    ];

    let vaultsCreated = 0;
    for (const vault of vaultsToCreate) {
      const vaultResult = await pool.query(
        `INSERT INTO testament_vaults (testament_id, vault_dimension, vault_name, content_type, natural_heir)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [TEST_USER_ID, vault.dimension, vault.name, vault.type, 'Test Heir']
      );
      if (vaultResult.rows.length > 0) vaultsCreated++;
    }

    if (vaultsCreated === 3) {
      logTest('Create Vaults', 'PASS', `${vaultsCreated} vaults created`);
    } else {
      logTest('Create Vaults', 'FAIL', `Only ${vaultsCreated}/3 vaults created`);
    }

    // Test 3: Create Beneficiaries (4 access levels)
    console.log('Test 3: Create beneficiaries...');
    const beneficiariesToCreate = [
      { name: 'Hijo Mayor', level: 'succession', mode: 'legado', relationship: 'child' },
      { name: 'Esposa', level: 'fusion', mode: 'vida', relationship: 'spouse' },
      { name: 'Socio', level: 'interaction', mode: 'delegado', relationship: 'business_partner' },
      { name: 'Amigo', level: 'consultation', mode: 'emergencia', relationship: 'friend' }
    ];

    let beneficiariesCreated = 0;
    const beneficiaryIds: string[] = [];

    for (const ben of beneficiariesToCreate) {
      const benResult = await pool.query(
        `INSERT INTO testament_beneficiaries (
          testament_id, beneficiary_name, relationship,
          access_level, activation_mode, priority
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [TEST_USER_ID, ben.name, ben.relationship, ben.level, ben.mode, beneficiariesCreated + 1]
      );
      if (benResult.rows.length > 0) {
        beneficiariesCreated++;
        beneficiaryIds.push(benResult.rows[0].id);
      }
    }

    if (beneficiariesCreated === 4) {
      logTest('Create Beneficiaries', 'PASS', `${beneficiariesCreated} beneficiaries created (4 levels)`);
    } else {
      logTest('Create Beneficiaries', 'FAIL', `Only ${beneficiariesCreated}/4 beneficiaries created`);
    }

    // Test 4: Create Ancestor AI Instance
    console.log('Test 4: Create ancestor AI...');
    const aiResult = await pool.query(
      `INSERT INTO ancestor_ai_instances (
        testament_id, ancestor_name, personality_profile,
        knowledge_base, model_version, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        TEST_USER_ID,
        'Test Ancestor Carlos',
        JSON.stringify({ traits: ['wise', 'entrepreneurial'], communication_style: 'direct' }),
        JSON.stringify({ business: ['CIVEK Empire'], technical: ['AI', 'Cloud'], personal: ['family values'] }),
        'claude-opus-4.6',
        'active'
      ]
    );

    if (aiResult.rows.length > 0) {
      logTest('Create Ancestor AI', 'PASS', `AI ID: ${aiResult.rows[0].id}`);

      // Test 5: Log Ancestor Conversation
      console.log('Test 5: Log ancestor conversation...');
      const conversationResult = await pool.query(
        `SELECT log_ancestor_conversation($1, $2, $3, $4, $5, $6) as conversation_id`,
        [
          aiResult.rows[0].id,
          beneficiaryIds[0],
          crypto.randomUUID(),
          'user',
          'Padre, ¿cómo debo manejar el crecimiento de la empresa?',
          JSON.stringify({})
        ]
      );

      if (conversationResult.rows.length > 0) {
        logTest('Log Conversation', 'PASS', `Conversation logged`);
      } else {
        logTest('Log Conversation', 'FAIL', 'No conversation logged');
      }
    } else {
      logTest('Create Ancestor AI', 'FAIL', 'No AI instance created');
    }

    // Test 6: Create Memorial Profile
    console.log('Test 6: Create memorial profile...');
    const memorialResult = await pool.query(
      `INSERT INTO memorial_profiles (
        testament_id, profile_name, biography,
        life_achievements, quotes, visibility, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        TEST_USER_ID,
        'Carlos Mora Morales',
        'Fundador del Imperio CIVEK. Visionario tecnológico y empresario.',
        ['Fundó CIVEK Empire', 'Creó CIVEK OS', 'Lanzó CIVEK NEXUS'],
        ['CIVEK OS PRIMERO — SIEMPRE', 'Code ejecuta. La Asamblea asesora. Carlos decide.'],
        'family',
        'published'
      ]
    );

    if (memorialResult.rows.length > 0) {
      logTest('Create Memorial', 'PASS', `Memorial ID: ${memorialResult.rows[0].id}`);
    } else {
      logTest('Create Memorial', 'FAIL', 'No memorial created');
    }

    // Test 7: Activate Legacy (modo vida - should activate immediately)
    console.log('Test 7: Activate legacy (modo vida)...');
    const vidaBeneficiary = beneficiaryIds[1]; // Esposa con modo 'vida'
    const activationResult = await pool.query(
      `SELECT activate_legacy_for_beneficiary($1, FALSE) as result`,
      [vidaBeneficiary]
    );

    const activation = activationResult.rows[0].result;
    if (activation.success) {
      logTest('Activate Legacy', 'PASS', `Activated for beneficiary (modo vida)`);
    } else {
      logTest('Activate Legacy', 'FAIL', activation.error || 'Unknown error');
    }

    // Test 8: Query functions
    console.log('Test 8: Test get_ancestor_wisdom function...');
    const wisdomResult = await pool.query(
      `SELECT get_ancestor_wisdom($1) as wisdom`,
      [TEST_USER_ID]
    );

    const wisdom = wisdomResult.rows[0].wisdom;
    if (wisdom.available) {
      logTest('Get Ancestor Wisdom', 'PASS', `Wisdom available for ${wisdom.ancestor_name}`);
    } else {
      logTest('Get Ancestor Wisdom', 'FAIL', 'Wisdom not available');
    }

  } catch (error: any) {
    logTest('ANCESTOR PROTOCOL', 'FAIL', 'Fatal error in tests', error.message);
  }
}

// ============================================================================
// DIVISION INTEGRATIONS TESTS
// ============================================================================

async function testDivisionIntegrations() {
  console.log('\n🧪 DIVISION INTEGRATIONS TESTS\n');

  try {
    // Test 1: Create Hipobid Integration
    console.log('Test 1: Create Hipobid integration...');
    const hipobidResult = await pool.query(
      `INSERT INTO hipobid_integrations (user_id, integration_status)
       VALUES ($1, 'active')
       ON CONFLICT (user_id) DO UPDATE SET integration_status = 'active'
       RETURNING id`,
      [TEST_USER_ID]
    );

    if (hipobidResult.rows.length > 0) {
      logTest('Hipobid Integration', 'PASS', 'Integration active');

      // Add a tender
      const tenderResult = await pool.query(
        `INSERT INTO hipobid_tenders (
          user_id, tender_title, tender_category, country,
          budget_amount, submission_deadline, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          TEST_USER_ID,
          'E2E Test Tender - Hospital Equipment',
          'Healthcare',
          'Costa Rica',
          500000,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          'open'
        ]
      );

      if (tenderResult.rows.length > 0) {
        logTest('Hipobid Add Tender', 'PASS', `Tender created`);
      } else {
        logTest('Hipobid Add Tender', 'FAIL', 'No tender created');
      }
    } else {
      logTest('Hipobid Integration', 'FAIL', 'Integration not created');
    }

    // Test 2: Create Uttill Integration
    console.log('Test 2: Create Uttill integration...');
    const uttillResult = await pool.query(
      `INSERT INTO uttill_integrations (user_id, integration_status, loyalty_points)
       VALUES ($1, 'active', 0)
       ON CONFLICT (user_id) DO UPDATE SET integration_status = 'active'
       RETURNING id`,
      [TEST_USER_ID]
    );

    if (uttillResult.rows.length > 0) {
      logTest('Uttill Integration', 'PASS', 'Integration active');

      // Create an order
      const orderResult = await pool.query(
        `INSERT INTO uttill_orders (
          user_id, order_number, total_amount, status, items
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [
          TEST_USER_ID,
          'E2E-' + Date.now(),
          25000,
          'confirmed',
          JSON.stringify([
            { product_id: 'uttill-001', name: 'Cemento', quantity: 5, price: 8500 },
            { product_id: 'uttill-002', name: 'Arena', quantity: 1, price: 12000 }
          ])
        ]
      );

      if (orderResult.rows.length > 0) {
        logTest('Uttill Create Order', 'PASS', `Order created`);

        // Calculate loyalty points
        const pointsResult = await pool.query(
          `SELECT calculate_uttill_loyalty_points($1) as points`,
          [TEST_USER_ID]
        );

        logTest('Uttill Loyalty Points', 'PASS', `Points: ${pointsResult.rows[0].points}`);
      } else {
        logTest('Uttill Create Order', 'FAIL', 'No order created');
      }
    } else {
      logTest('Uttill Integration', 'FAIL', 'Integration not created');
    }

    // Test 3: Create Distribeaute Integration
    console.log('Test 3: Create Distribeaute integration...');
    const distribeauteResult = await pool.query(
      `INSERT INTO distribeaute_integrations (
        user_id, distributor_level, integration_status,
        enrollment_date, current_month_sales
      ) VALUES ($1, $2, 'active', CURRENT_DATE, $3)
      ON CONFLICT (user_id) DO UPDATE
      SET current_month_sales = $3, updated_at = NOW()
      RETURNING id`,
      [TEST_USER_ID, 'customer', 2500]
    );

    if (distribeauteResult.rows.length > 0) {
      logTest('Distribeaute Integration', 'PASS', 'Integration active');

      // Update rank based on sales
      const rankResult = await pool.query(
        `SELECT update_distribeaute_rank($1) as new_rank`,
        [TEST_USER_ID]
      );

      logTest('Distribeaute Rank Update', 'PASS', `New rank: ${rankResult.rows[0].new_rank}`);
    } else {
      logTest('Distribeaute Integration', 'FAIL', 'Integration not created');
    }

    // Test 4: Create Dr.Vek Integration
    console.log('Test 4: Create Dr.Vek integration...');
    const drvekResult = await pool.query(
      `INSERT INTO drvek_integrations (
        user_id, integration_status, health_profile
      ) VALUES ($1, 'active', $2)
      ON CONFLICT (user_id) DO UPDATE SET integration_status = 'active'
      RETURNING id`,
      [
        TEST_USER_ID,
        JSON.stringify({
          dosha: 'vata-pitta',
          allergies: [],
          chronic_conditions: [],
          health_goals: ['stress_management', 'energy_boost']
        })
      ]
    );

    if (drvekResult.rows.length > 0) {
      logTest('Dr.Vek Integration', 'PASS', 'Integration active');

      // Add health record
      const recordResult = await pool.query(
        `INSERT INTO drvek_health_records (
          user_id, record_type, record_date, title, description
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4)
        RETURNING id`,
        [
          TEST_USER_ID,
          'consultation',
          'E2E Test Consultation',
          'Annual wellness checkup'
        ]
      );

      if (recordResult.rows.length > 0) {
        logTest('Dr.Vek Add Record', 'PASS', 'Health record created');
      } else {
        logTest('Dr.Vek Add Record', 'FAIL', 'No record created');
      }
    } else {
      logTest('Dr.Vek Integration', 'FAIL', 'Integration not created');
    }

    // Test 5: Get Divisions Status
    console.log('Test 5: Get all divisions status...');
    const statusResult = await pool.query(
      `SELECT get_user_divisions_status($1) as status`,
      [TEST_USER_ID]
    );

    const divisionsStatus = statusResult.rows[0].status;
    const activeCount = Object.values(divisionsStatus).filter(s => s === 'active').length;

    if (activeCount === 4) {
      logTest('Divisions Status', 'PASS', `All 4 divisions active`);
    } else {
      logTest('Divisions Status', 'FAIL', `Only ${activeCount}/4 divisions active`);
    }

  } catch (error: any) {
    logTest('DIVISION INTEGRATIONS', 'FAIL', 'Fatal error in tests', error.message);
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CIVEK NEXUS E2E TESTS - Session #070');
  console.log('  Sprint 22: ANCESTOR PROTOCOL');
  console.log('  Sprint 19: Division Integrations');
  console.log('═══════════════════════════════════════════════════════');

  await testAncestorProtocol();
  await testDivisionIntegrations();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const totalCount = results.length;
  const passRate = ((passCount / totalCount) * 100).toFixed(1);

  console.log(`\nTotal Tests: ${totalCount}`);
  console.log(`✅ Passed: ${passCount} (${passRate}%)`);
  console.log(`❌ Failed: ${failCount}`);

  if (failCount > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}${r.error ? ': ' + r.error : ''}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  await pool.end();

  return { passCount, failCount, totalCount, passRate };
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(({ passCount, failCount, totalCount, passRate }) => {
      process.exit(failCount > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Fatal error running tests:', error);
      process.exit(1);
    });
}

export { runAllTests, testAncestorProtocol, testDivisionIntegrations };
