'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OathAcceptanceModal from '@/components/oath/OathAcceptanceModal';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export default function OathPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(true);

  const handleAccept = async () => {
    try {
      const res = await fetch('/api/oath', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: MOCK_USER_ID })
      });

      if (res.ok) {
        router.push('/profile');
      } else {
        const error = await res.json();
        alert(error.error || 'Error al aceptar juramento');
      }
    } catch (error) {
      console.error('Error accepting oath:', error);
      alert('Error al aceptar juramento');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <OathAcceptanceModal
        isOpen={showModal}
        onClose={() => router.push('/')}
        onAccept={handleAccept}
      />
    </div>
  );
}
