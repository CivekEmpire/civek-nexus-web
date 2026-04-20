'use client';

import { useState } from 'react';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
}

export default function CreateSpaceModal({
  isOpen,
  onClose,
  userId,
  onSuccess
}: CreateSpaceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'group' as 'community' | 'group' | 'channel',
    circle_type: 'shared',
    visibility: 'private',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          owner_id: userId
        })
      });

      if (res.ok) {
        setFormData({
          name: '',
          type: 'group',
          circle_type: 'shared',
          visibility: 'private',
          description: ''
        });
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear espacio');
      }
    } catch (error) {
      console.error('Error creating space:', error);
      alert('Error al crear espacio');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Crear Espacio</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre del espacio *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Equipo de Marketing"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de espacio *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'community', label: 'Comunidad', icon: '👥', desc: 'Abierto o con aprobación' },
                  { value: 'group', label: 'Grupo', icon: '🔒', desc: 'Privado, solo invitación' },
                  { value: 'channel', label: 'Canal', icon: '📢', desc: 'Solo admins publican' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value as any })}
                    className={`p-3 border rounded-lg text-left transition ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Circle Type */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Círculo
              </label>
              <select
                value={formData.circle_type}
                onChange={(e) => setFormData({ ...formData, circle_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="shared">Compartido</option>
                <option value="vida">Vida</option>
                <option value="negocios">Negocios</option>
                <option value="elite">Élite</option>
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Visibilidad
              </label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">Público</option>
                <option value="private">Privado</option>
                <option value="invite">Solo invitación</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="¿De qué trata este espacio?"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!formData.name.trim() || creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creando...' : 'Crear Espacio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
