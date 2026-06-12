// components/shared/Avatar.tsx
import React from 'react';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function Avatar({ name, url, size = 'md' }: AvatarProps) {
  const getInitials = (n: string) => {
    return n.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  };

  const getGradient = (n: string) => {
    const gradients = [
      'from-kovex-primary to-[#7B0E55]',
      'from-kovex-accent to-[#0E7B6B]',
      'from-kovex-warning to-[#9A6206]',
      'from-[#A78BFA] to-[#5B3FBE]',
      'from-[#60A5FA] to-[#1D4ED8]',
      'from-kovex-success to-[#15803D]'
    ];
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = (hash * 31 + n.charCodeAt(i)) % gradients.length;
    }
    return gradients[hash];
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-base',
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 border border-kovex-border ${sizeClasses[size]}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${getGradient(name)} flex items-center justify-center font-bold text-white flex-shrink-0 select-none ${sizeClasses[size]}`}
    >
      {getInitials(name)}
    </div>
  );
}
