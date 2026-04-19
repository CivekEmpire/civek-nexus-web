'use client';

import { useState } from 'react';
import CircleSelector from '@/components/profile/CircleSelector';
import VerificationBadge from '@/components/profile/VerificationBadge';
import ReputationScore from '@/components/profile/ReputationScore';

type CircleType = 'vida' | 'negocios' | 'elite';

export default function ProfilePage() {
  const [currentCircle, setCurrentCircle] = useState<CircleType>('vida');

  // Mock data - in production, fetch from API
  const mockUser = {
    name: 'Carlos Mora',
    email: 'cmoramorales@gmail.com',
    circles: {
      vida: {
        verified: true,
        verificationMethod: 'Email + Phone',
        reputationScore: 450
      },
      negocios: {
        verified: false,
        verificationMethod: undefined,
        reputationScore: 120
      },
      elite: {
        verified: false,
        verificationMethod: undefined,
        reputationScore: 0
      }
    }
  };

  const circleData = mockUser.circles[currentCircle];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Mi Perfil</h1>
        <p className="text-gray-600 mb-8">Gestiona tus círculos y reputación</p>

        {/* Circle Selector */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Seleccionar Círculo</h2>
          <CircleSelector
            currentCircle={currentCircle}
            onCircleChange={setCurrentCircle}
          />
        </div>

        {/* Profile Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* User Info */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Nombre:</span>
                <p className="font-medium">{mockUser.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Email:</span>
                <p className="font-medium">{mockUser.email}</p>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-600 block mb-2">Estado:</span>
                <VerificationBadge
                  verified={circleData.verified}
                  verificationMethod={circleData.verificationMethod}
                />
              </div>
            </div>
          </div>

          {/* Reputation Score */}
          <div className="bg-white p-6 rounded-lg border flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold mb-4">Reputación</h3>
            <ReputationScore score={circleData.reputationScore} size="lg" />
          </div>

          {/* Circle Stats */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Estadísticas del Círculo</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Referencias:</span>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Conexiones:</span>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Actividad:</span>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Actions */}
        {!circleData.verified && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">
              Verificación Pendiente
            </h3>
            <p className="text-blue-700 mb-4">
              Completa la verificación para desbloquear todas las funcionalidades del círculo {currentCircle}.
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
              Iniciar Verificación
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
