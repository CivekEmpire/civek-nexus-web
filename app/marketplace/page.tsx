'use client';

import { useState, useEffect } from 'react';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  creator_name: string;
  pricing_model: string;
  price_amount: number;
  install_count: number;
  rating_avg: number;
  rating_count: number;
  icon_emoji: string;
}

export default function MarketplacePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    fetchAgents();
  }, [category]);

  const fetchAgents = async () => {
    try {
      let url = '/api/marketplace/agents?sort=popular';
      if (category !== 'all') {
        url += `&category=${category}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (agentId: string) => {
    try {
      const res = await fetch(`/api/marketplace/agents/${agentId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: MOCK_USER_ID })
      });

      if (res.ok) {
        alert('Agente instalado exitosamente');
        fetchAgents();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al instalar agente');
      }
    } catch (error) {
      console.error('Error installing agent:', error);
      alert('Error al instalar agente');
    }
  };

  const categories = [
    { value: 'all', label: 'Todos', icon: '📋' },
    { value: 'health', label: 'Salud', icon: '🏥' },
    { value: 'finance', label: 'Finanzas', icon: '💰' },
    { value: 'productivity', label: 'Productividad', icon: '⚡' },
    { value: 'family', label: 'Familia', icon: '👨‍👩‍👧‍👦' },
    { value: 'business', label: 'Negocios', icon: '💼' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Marketplace de Agentes</h1>
              <p className="text-gray-600">
                Descubre y comparte agentes IA especializados
              </p>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Crear Agente
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  category === cat.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando agentes...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No hay agentes en esta categoría</h2>
            <p className="text-gray-600">Sé el primero en crear uno</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onInstall={() => handleInstall(agent.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent, onInstall }: { agent: Agent; onInstall: () => void }) {
  const getPricingLabel = () => {
    if (agent.pricing_model === 'free') return 'Gratis';
    if (agent.pricing_model === 'freemium') return 'Freemium';
    return `$${agent.price_amount}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{agent.icon_emoji}</div>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
          {getPricingLabel()}
        </span>
      </div>

      <h3 className="font-semibold text-lg mb-2">{agent.name}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{agent.description}</p>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-1">
          ⭐ {agent.rating_avg.toFixed(1)}
          {agent.rating_count > 0 && ` (${agent.rating_count})`}
        </div>
        <div>📥 {agent.install_count}</div>
      </div>

      <div className="text-xs text-gray-500 mb-4">
        Por {agent.creator_name}
      </div>

      <button
        onClick={onInstall}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Instalar
      </button>
    </div>
  );
}
