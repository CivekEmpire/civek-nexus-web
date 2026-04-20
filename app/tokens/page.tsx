'use client';

import { useState, useEffect } from 'react';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export default function TokensPage() {
  const [balance, setBalance] = useState(0);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, redemptionsRes] = await Promise.all([
        fetch(`/api/tokens?user_id=${MOCK_USER_ID}`),
        fetch('/api/tokens/redeem')
      ]);

      const balanceData = await balanceRes.json();
      const redemptionsData = await redemptionsRes.json();

      setBalance(balanceData.balance || 0);
      setRedemptions(redemptionsData.redemptions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (redemptionId: string) => {
    try {
      const res = await fetch('/api/tokens/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: MOCK_USER_ID, redemption_id: redemptionId })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchData();
      } else {
        alert(data.error || 'Error al canjear');
      }
    } catch (error) {
      console.error('Error redeeming:', error);
      alert('Error al canjear tokens');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Balance */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="text-sm opacity-80 mb-2">Tu Balance</div>
          <div className="text-6xl font-bold mb-4">🪙 {balance}</div>
          <div className="text-sm opacity-90">Tokens CIVEK disponibles</div>
        </div>

        {/* Earn Section */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Cómo Ganar Tokens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { action: 'Completar perfil', tokens: 100 },
              { action: 'Primera publicación', tokens: 50 },
              { action: 'Login diario', tokens: 10 },
              { action: 'Referir amigo verificado', tokens: 500 },
              { action: 'Moderación espacios', tokens: 10 },
              { action: 'Usuario activo del mes', tokens: 200 }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <span className="text-gray-700">{item.action}</span>
                <span className="font-semibold text-blue-600">+{item.tokens} 🪙</span>
              </div>
            ))}
          </div>
        </div>

        {/* Redeem Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Canjear Tokens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {redemptions.map((redemption) => (
              <div key={redemption.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">{redemption.redemption_name}</h3>
                <p className="text-sm text-gray-600 mb-4">{redemption.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-600">{redemption.tokens_cost} 🪙</span>
                  <button
                    onClick={() => handleRedeem(redemption.id)}
                    disabled={balance < redemption.tokens_cost}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Canjear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
