'use client';

import { useEffect, useState } from 'react';

interface ScoreData {
  total_score: number;
  level: string;
  components: {
    trust: { score: number; weight: number; details: any };
    contribution: { score: number; weight: number; details: any };
    reputation: { score: number; weight: number; details: any };
    impact: { score: number; weight: number; details: any };
  };
}

interface NexusScoreDashboardProps {
  userId: string;
}

export default function NexusScoreDashboard({ userId }: NexusScoreDashboardProps) {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScore();
  }, [userId]);

  const fetchScore = async () => {
    try {
      const res = await fetch(`/api/score?user_id=${userId}`);
      const data = await res.json();
      setScoreData(data);
    } catch (error) {
      console.error('Error fetching score:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando score...</div>;
  }

  if (!scoreData) {
    return <div className="text-center py-8">Error cargando score</div>;
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ancestro': return 'text-purple-600 bg-purple-100';
      case 'lider': return 'text-blue-600 bg-blue-100';
      case 'constructor': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelName = (level: string) => {
    const names: Record<string, string> = {
      ancestro: 'Ancestro',
      lider: 'Líder',
      constructor: 'Constructor',
      explorador: 'Explorador'
    };
    return names[level] || level;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Total Score */}
      <div className="text-center mb-8">
        <div className="inline-block">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="transform -rotate-90 w-full h-full">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${(scoreData.total_score / 1000) * 283} ${283 - (scoreData.total_score / 1000) * 283}`}
                className={getLevelColor(scoreData.level).split(' ')[0]}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold">{scoreData.total_score}</span>
            </div>
          </div>
          <div className={`inline-block px-4 py-2 rounded-full ${getLevelColor(scoreData.level)}`}>
            <span className="font-semibold">{getLevelName(scoreData.level)}</span>
          </div>
        </div>
      </div>

      {/* Components Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trust */}
        <ComponentCard
          title="Confianza"
          score={scoreData.components.trust.score}
          weight={scoreData.components.trust.weight}
          color="blue"
          details={[
            { label: 'Referencias', value: scoreData.components.trust.details.references },
            { label: 'Verificaciones', value: scoreData.components.trust.details.verifications }
          ]}
        />

        {/* Contribution */}
        <ComponentCard
          title="Contribución"
          score={scoreData.components.contribution.score}
          weight={scoreData.components.contribution.weight}
          color="green"
          details={[
            { label: 'Horas moderación', value: scoreData.components.contribution.details.moderation_hours },
            { label: 'Ayudas', value: scoreData.components.contribution.details.help_actions }
          ]}
        />

        {/* Reputation */}
        <ComponentCard
          title="Reputación"
          score={scoreData.components.reputation.score}
          weight={scoreData.components.reputation.weight}
          color="purple"
          details={[
            { label: 'Feedback positivo', value: scoreData.components.reputation.details.positive },
            { label: 'Deals completados', value: scoreData.components.reputation.details.deals_completed }
          ]}
        />

        {/* Impact */}
        <ComponentCard
          title="Impacto"
          score={scoreData.components.impact.score}
          weight={scoreData.components.impact.weight}
          color="orange"
          details={[
            { label: 'Referidos', value: scoreData.components.impact.details.referrals },
            { label: 'Deal flow', value: scoreData.components.impact.details.deal_flow }
          ]}
        />
      </div>

      {/* How to improve */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-4">Cómo mejorar tu score:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ Completa verificaciones para aumentar Confianza</li>
          <li>✓ Ayuda a otros miembros para aumentar Contribución</li>
          <li>✓ Recibe feedback positivo para aumentar Reputación</li>
          <li>✓ Refiere nuevos miembros para aumentar Impacto</li>
        </ul>
      </div>
    </div>
  );
}

function ComponentCard({
  title,
  score,
  weight,
  color,
  details
}: {
  title: string;
  score: number;
  weight: number;
  color: string;
  details: { label: string; value: number }[];
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600'
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-gray-500">{(weight * 100).toFixed(0)}%</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>Score</span>
          <span className="font-semibold">{score.toFixed(1)}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${colorClasses[color]} h-2 rounded-full transition-all`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        {details.map((detail, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{detail.label}:</span>
            <span className="font-medium">{detail.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
