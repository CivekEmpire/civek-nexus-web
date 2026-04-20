'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SpaceCard from '@/components/spaces/SpaceCard';
import CreateSpaceModal from '@/components/spaces/CreateSpaceModal';

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
  updated_at: string;
}

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'community' | 'group' | 'channel'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchSpaces();
  }, [filter]);

  const fetchSpaces = async () => {
    try {
      let url = `/api/spaces?user_id=${MOCK_USER_ID}`;
      if (filter !== 'all') {
        url += `&type=${filter}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setSpaces(data.spaces || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceClick = (spaceId: string) => {
    router.push(`/spaces/${spaceId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Espacios</h1>
              <p className="text-gray-600 mt-1">
                Comunidades, grupos y canales de CIVEK NEXUS
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Crear Espacio
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Todos', icon: '📋' },
              { value: 'community', label: 'Comunidades', icon: '👥' },
              { value: 'group', label: 'Grupos', icon: '🔒' },
              { value: 'channel', label: 'Canales', icon: '📢' }
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Cargando espacios...</div>
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold mb-2">No hay espacios aún</h2>
            <p className="text-gray-600 mb-6">
              Crea tu primer espacio para comenzar a colaborar
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Crear primer espacio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onClick={() => handleSpaceClick(space.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateSpaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={MOCK_USER_ID}
        onSuccess={fetchSpaces}
      />
    </div>
  );
}
