'use client';

import { useState } from 'react';

type CircleType = 'vida' | 'negocios' | 'elite';

interface CircleSelectorProps {
  currentCircle: CircleType;
  onCircleChange: (circle: CircleType) => void;
  disabled?: boolean;
}

export default function CircleSelector({
  currentCircle,
  onCircleChange,
  disabled = false
}: CircleSelectorProps) {
  const circles = [
    {
      id: 'vida' as CircleType,
      name: 'Vida',
      icon: '🏡',
      description: 'Familia, amigos, eventos personales',
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'negocios' as CircleType,
      name: 'Negocios',
      icon: '💼',
      description: 'Proyectos, clientes, oportunidades',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'elite' as CircleType,
      name: 'Élite',
      icon: '👑',
      description: 'Inversiones, legacy, estrategia',
      color: 'from-yellow-500 to-yellow-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {circles.map((circle) => (
        <button
          key={circle.id}
          onClick={() => !disabled && onCircleChange(circle.id)}
          disabled={disabled}
          className={`
            p-6 rounded-lg border-2 transition-all
            ${currentCircle === circle.id
              ? `bg-gradient-to-r ${circle.color} text-white border-transparent scale-105`
              : 'bg-white border-gray-200 hover:border-gray-300 hover:scale-102'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="text-4xl mb-2">{circle.icon}</div>
          <h3 className="text-xl font-semibold mb-1">{circle.name}</h3>
          <p className={`text-sm ${
            currentCircle === circle.id ? 'text-white/90' : 'text-gray-600'
          }`}>
            {circle.description}
          </p>
        </button>
      ))}
    </div>
  );
}
