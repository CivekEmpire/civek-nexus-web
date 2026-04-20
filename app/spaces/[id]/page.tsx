'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SpaceChat from '@/components/spaces/SpaceChat';

// Mock user ID (replace with actual auth)
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

interface Space {
  id: string;
  name: string;
  type: 'community' | 'group' | 'channel';
  circle_type: string;
  visibility: string;
  description: string;
  member_count: number;
  user_role: string;
}

interface Member {
  user_id: string;
  name: string;
  role: string;
  joined_at: string;
}

export default function SpacePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'settings'>('chat');

  useEffect(() => {
    fetchSpace();
    fetchMembers();
  }, [params.id]);

  const fetchSpace = async () => {
    try {
      const res = await fetch(`/api/spaces?user_id=${MOCK_USER_ID}`);
      const data = await res.json();
      const found = data.spaces?.find((s: Space) => s.id === params.id);
      if (found) {
        setSpace(found);
      } else {
        router.push('/spaces');
      }
    } catch (error) {
      console.error('Error fetching space:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/spaces/${params.id}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Espacio no encontrado</div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'community': return '👥';
      case 'group': return '🔒';
      case 'channel': return '📢';
      default: return '💬';
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/spaces')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Volver
            </button>
            <div className="text-2xl">{getTypeIcon(space.type)}</div>
            <div>
              <h1 className="text-xl font-bold">{space.name}</h1>
              <p className="text-sm text-gray-600">
                {space.member_count} miembros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
              {space.user_role || 'member'}
            </span>
          </div>
        </div>

        {space.description && (
          <p className="text-sm text-gray-600 mb-3">{space.description}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b -mb-4">
          {[
            { value: 'chat', label: 'Chat', icon: '💬' },
            { value: 'members', label: 'Miembros', icon: '👥' },
            { value: 'settings', label: 'Configuración', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <SpaceChat
            spaceId={params.id}
            userId={MOCK_USER_ID}
            spaceType={space.type}
            userRole={space.user_role || 'member'}
          />
        )}

        {activeTab === 'members' && (
          <div className="p-4 overflow-y-auto h-full">
            <h2 className="font-semibold mb-4">
              Miembros ({members.length})
            </h2>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {member.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-gray-500">
                        Unido{' '}
                        {new Date(member.joined_at).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4">
            <h2 className="font-semibold mb-4">Configuración del Espacio</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Tipo</div>
                <div className="font-medium">{space.type}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Visibilidad</div>
                <div className="font-medium">{space.visibility}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Círculo</div>
                <div className="font-medium">{space.circle_type}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
