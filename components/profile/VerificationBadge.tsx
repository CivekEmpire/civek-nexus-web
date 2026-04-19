'use client';

interface VerificationBadgeProps {
  verified: boolean;
  verificationMethod?: string;
  verificationDate?: string;
}

export default function VerificationBadge({
  verified,
  verificationMethod,
  verificationDate
}: VerificationBadgeProps) {
  if (!verified) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        No Verificado
      </span>
    );
  }

  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-medium">Verificado</span>
      {verificationMethod && (
        <span className="ml-2 text-xs text-green-600">
          ({verificationMethod})
        </span>
      )}
    </div>
  );
}
