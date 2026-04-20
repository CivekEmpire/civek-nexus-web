'use client';

import { useState, useEffect } from 'react';

interface OathStatusProps {
  userId: string;
}

export default function OathStatus({ userId }: OathStatusProps) {
  const [oathData, setOathData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOathStatus();
  }, [userId]);

  const fetchOathStatus = async () => {
    try {
      const res = await fetch(`/api/oath?user_id=${userId}`);
      const data = await res.json();
      setOathData(data);
    } catch (error) {
      console.error('Error fetching oath status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Cargando...</div>;
  }

  if (!oathData?.accepted) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📜</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Juramento NEXUS pendiente
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Acepta el Juramento NEXUS para acceder a todas las funciones
            </p>
            <button
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => window.location.href = '/oath'}
            >
              Ver Juramento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">✅</span>
        <div>
          <div className="font-semibold text-green-900">Juramento Aceptado</div>
          <div className="text-xs text-green-700">
            Desde {new Date(oathData.oath.accepted_at).toLocaleDateString('es-ES')}
          </div>
        </div>
      </div>
    </div>
  );
}
