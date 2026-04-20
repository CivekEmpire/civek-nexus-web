'use client';

import { useState, useEffect } from 'react';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export default function BillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/billing/plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Planes y Precios</h1>
          <p className="text-xl text-gray-600">
            Elige el plan perfecto para ti
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-gray-600">
          <p>Todos los planes incluyen:</p>
          <p>✓ Soporte 24/7 · ✓ Datos encriptados · ✓ Sin anuncios</p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const isElite = plan.circle_type === 'elite';
  const isFree = plan.price_monthly === 0;

  return (
    <div className={`bg-white rounded-2xl p-8 border-2 ${
      isElite ? 'border-purple-500 shadow-2xl' : 'border-gray-200'
    }`}>
      {isElite && (
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
            Más Popular
          </span>
        </div>
      )}

      <h3 className="text-2xl font-bold mb-2">{plan.plan_name}</h3>
      <div className="mb-6">
        <span className="text-5xl font-bold">
          ${plan.price_monthly}
        </span>
        {!isFree && <span className="text-gray-600">/mes</span>}
      </div>

      {plan.price_yearly && plan.price_yearly > 0 && (
        <div className="text-sm text-green-600 mb-6">
          Ahorra ${(plan.price_monthly * 12 - plan.price_yearly).toFixed(0)} pagando anualmente
        </div>
      )}

      <ul className="space-y-3 mb-8">
        {(JSON.parse(plan.features) || []).map((feature: string, idx: number) => (
          <li key={idx} className="flex items-center gap-2 text-gray-700">
            <span className="text-green-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <button className={`w-full py-3 rounded-lg font-semibold transition ${
        isElite
          ? 'bg-purple-600 hover:bg-purple-700 text-white'
          : isFree
          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}>
        {isFree ? 'Plan Actual' : 'Empezar Ahora'}
      </button>
    </div>
  );
}
