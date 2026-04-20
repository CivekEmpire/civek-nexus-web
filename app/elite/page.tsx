'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export default function EliteDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'deals' | 'events' | 'concierge' | 'legacy'>('deals');

  const sections = [
    { id: 'deals', label: 'Deal Flow', icon: '💼', desc: 'Oportunidades de inversión' },
    { id: 'events', label: 'Eventos', icon: '🎭', desc: 'Eventos exclusivos' },
    { id: 'concierge', label: 'Concierge', icon: '🎩', desc: 'Asistencia 24/7' },
    { id: 'legacy', label: 'Legacy', icon: '🏛️', desc: 'Herencia digital' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-purple-800/30 bg-black/30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">👑</span>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-200 to-purple-400 bg-clip-text text-transparent">
                  Círculo Élite
                </h1>
              </div>
              <p className="text-purple-200">Funciones exclusivas para miembros élite</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-300">Miembro desde</div>
              <div className="font-semibold">Enero 2026</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-purple-800/30 bg-black/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`px-6 py-4 text-left transition border-b-2 ${
                  activeSection === section.id
                    ? 'border-purple-400 bg-purple-500/10'
                    : 'border-transparent hover:bg-purple-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{section.icon}</span>
                  <span className="font-semibold">{section.label}</span>
                </div>
                <div className="text-xs text-purple-300">{section.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeSection === 'deals' && <DealsSection userId={MOCK_USER_ID} />}
        {activeSection === 'events' && <EventsSection userId={MOCK_USER_ID} />}
        {activeSection === 'concierge' && <ConciergeSection userId={MOCK_USER_ID} />}
        {activeSection === 'legacy' && <LegacySection userId={MOCK_USER_ID} />}
      </div>
    </div>
  );
}

function DealsSection({ userId }: { userId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Deal Flow</h2>
        <button className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
          + Crear Deal
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DealCard
          title="FarmaTech Startup Series A"
          type="Investment"
          stage="Due Diligence"
          amount="$500,000"
          sector="FarmaTech"
        />
        <div className="border border-dashed border-purple-500/30 rounded-lg p-6 flex items-center justify-center text-purple-400">
          <div className="text-center">
            <div className="text-4xl mb-2">+</div>
            <div>Agregar nuevo deal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealCard({ title, type, stage, amount, sector }: any) {
  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-lg p-4 hover:bg-white/10 transition cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs px-2 py-1 bg-purple-500/20 rounded">{type}</span>
      </div>
      <div className="text-2xl font-bold text-purple-400 mb-2">{amount}</div>
      <div className="flex items-center justify-between text-sm text-purple-300">
        <span>{stage}</span>
        <span>{sector}</span>
      </div>
    </div>
  );
}

function EventsSection({ userId }: { userId: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Eventos Exclusivos</h2>
      <div className="space-y-4">
        <EventCard
          title="CIVEK Elite Summit 2026"
          date="15 Jun 2026"
          location="San José, Costa Rica"
          attendees={45}
          capacity={100}
        />
      </div>
    </div>
  );
}

function EventCard({ title, date, location, attendees, capacity }: any) {
  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <div className="space-y-1 text-sm text-purple-300">
            <div>📅 {date}</div>
            <div>📍 {location}</div>
            <div>👥 {attendees}/{capacity} asistentes</div>
          </div>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
          RSVP
        </button>
      </div>
    </div>
  );
}

function ConciergeSection({ userId }: { userId: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Concierge AI 24/7</h2>
      <div className="bg-white/5 border border-purple-500/20 rounded-lg p-6 mb-6">
        <textarea
          placeholder="¿En qué puedo ayudarte hoy?"
          rows={4}
          className="w-full bg-black/30 border border-purple-500/20 rounded-lg p-4 text-white placeholder-purple-400/50"
        />
        <div className="flex gap-2 mt-4">
          {['Reservación', 'Investigación', 'Booking', 'Tarea'].map((type) => (
            <button key={type} className="px-3 py-1 text-sm bg-purple-500/20 rounded hover:bg-purple-500/30">
              {type}
            </button>
          ))}
        </div>
        <button className="mt-4 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 w-full">
          Enviar Solicitud
        </button>
      </div>
      <div className="text-sm text-purple-300 text-center">
        Respuesta típica en menos de 5 minutos
      </div>
    </div>
  );
}

function LegacySection({ userId }: { userId: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Legacy Manager</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-purple-500/20 rounded-lg p-6">
          <div className="text-3xl mb-3">📜</div>
          <h3 className="font-semibold mb-2">Testamento Digital</h3>
          <p className="text-sm text-purple-300 mb-4">
            Designa herederos y define instrucciones
          </p>
          <button className="text-purple-400 hover:text-purple-300 text-sm">
            Configurar →
          </button>
        </div>
        <div className="bg-white/5 border border-purple-500/20 rounded-lg p-6">
          <div className="text-3xl mb-3">🔐</div>
          <h3 className="font-semibold mb-2">Bóvedas Seguras</h3>
          <p className="text-sm text-purple-300 mb-4">
            Guarda documentos y credenciales
          </p>
          <button className="text-purple-400 hover:text-purple-300 text-sm">
            Abrir bóveda →
          </button>
        </div>
      </div>
    </div>
  );
}
