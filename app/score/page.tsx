'use client';

import NexusScoreDashboard from '@/components/score/NexusScoreDashboard';

// Mock user ID (replace with actual auth)
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export default function ScorePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-2">Mi Nexus Score</h1>
          <p className="text-gray-600">
            Tu reputación en CIVEK NEXUS. Aumenta tu score contribuyendo a la comunidad.
          </p>
        </div>
      </div>

      <NexusScoreDashboard userId={MOCK_USER_ID} />
    </div>
  );
}
