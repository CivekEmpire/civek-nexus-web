'use client';

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

interface SpaceCardProps {
  space: Space;
  onClick?: () => void;
}

export default function SpaceCard({ space, onClick }: SpaceCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'community': return '👥';
      case 'group': return '🔒';
      case 'channel': return '📢';
      default: return '💬';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'community': return 'Comunidad';
      case 'group': return 'Grupo';
      case 'channel': return 'Canal';
      default: return type;
    }
  };

  const getCircleColor = (circleType: string) => {
    switch (circleType) {
      case 'vida': return 'bg-green-100 text-green-800';
      case 'negocios': return 'bg-blue-100 text-blue-800';
      case 'elite': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{getTypeIcon(space.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{space.name}</h3>
            {space.visibility === 'private' && (
              <span className="text-xs text-gray-500">🔒</span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
              {getTypeLabel(space.type)}
            </span>
            {space.circle_type && (
              <span className={`text-xs px-2 py-1 rounded ${getCircleColor(space.circle_type)}`}>
                {space.circle_type}
              </span>
            )}
          </div>

          {space.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {space.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{space.member_count} miembros</span>
            <span>
              Actualizado{' '}
              {new Date(space.updated_at).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
