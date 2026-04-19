'use client';

interface ReputationScoreProps {
  score: number; // 0-1000
  size?: 'sm' | 'md' | 'lg';
}

export default function ReputationScore({ score, size = 'md' }: ReputationScoreProps) {
  const percentage = (score / 1000) * 100;

  const getLevel = (score: number): { name: string; color: string } => {
    if (score >= 800) return { name: 'Ancestro', color: 'text-purple-600' };
    if (score >= 600) return { name: 'Líder', color: 'text-blue-600' };
    if (score >= 300) return { name: 'Constructor', color: 'text-green-600' };
    return { name: 'Explorador', color: 'text-gray-600' };
  };

  const level = getLevel(score);

  const sizeClasses = {
    sm: 'w-16 h-16 text-sm',
    md: 'w-24 h-24 text-base',
    lg: 'w-32 h-32 text-lg'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${percentage * 2.83} ${(100 - percentage) * 2.83}`}
            className={level.color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{score}</span>
        </div>
      </div>
      <span className={`mt-2 font-medium ${level.color}`}>
        {level.name}
      </span>
    </div>
  );
}
