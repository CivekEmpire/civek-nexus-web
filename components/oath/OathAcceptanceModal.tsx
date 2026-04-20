'use client';

import { useState } from 'react';

interface OathAcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => Promise<void>;
}

const OATH_TEXT = `Yo, [nombre], en mi honor y palabra, me comprometo a:

1. Actuar con verdad en esta red.
2. No dañar a otros miembros.
3. Contribuir al bien común del círculo.
4. Honrar el legado de quienes me precedieron.
5. Dejar un mundo mejor para quienes me sucedan.

Si falto a este juramento, acepto las consecuencias que el círculo determine.

CIVEK NEXUS — El legado que no muere.`;

export default function OathAcceptanceModal({
  isOpen,
  onClose,
  onAccept
}: OathAcceptanceModalProps) {
  const [accepting, setAccepting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!agreed) return;

    setAccepting(true);
    try {
      await onAccept();
      onClose();
    } catch (error) {
      console.error('Error accepting oath:', error);
      alert('Error al aceptar el juramento. Por favor intenta de nuevo.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-center">
            El Juramento NEXUS
          </h2>

          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
              {OATH_TEXT}
            </pre>
          </div>

          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                He leído y acepto el Juramento NEXUS. Me comprometo a actuar con honor
                y responsabilidad en esta comunidad.
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={accepting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAccept}
              disabled={!agreed || accepting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Aceptando...' : 'Acepto el Juramento'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            En otras redes, tienes términos y condiciones. En CIVEK NEXUS, tienes palabra.
          </p>
        </div>
      </div>
    </div>
  );
}
