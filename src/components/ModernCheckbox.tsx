'use client';

import React from 'react';

interface ModernCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  variant?: 'round' | 'square';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  indeterminate?: boolean;
}

export default function ModernCheckbox({
  checked,
  onChange,
  label,
  variant = 'round',
  size = 'md',
  disabled = false,
  className = '',
  indeterminate = false
}: ModernCheckboxProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSizes = {
    sm: 'p-0.5',
    md: 'p-0.5',
    lg: 'p-1'
  };

  const shapeClasses = {
    round: 'rounded-full',
    square: 'rounded-md'
  };

  const getCheckboxClasses = () => {
    const baseClasses = `relative ${sizeClasses[size]} ${shapeClasses[variant]} border-2 transition-all duration-200 checkbox-hover`;
    
    if (disabled) {
      return `${baseClasses} bg-gray-600 border-gray-500 cursor-not-allowed opacity-50`;
    }

    if (checked) {
      return `${baseClasses} bg-[#1DB954] border-[#1DB954] shadow-lg shadow-[#1DB954]/30 scale-105`;
    }

    if (indeterminate) {
      return `${baseClasses} bg-[#1DB954]/50 border-[#1DB954] shadow-md shadow-[#1DB954]/20`;
    }

    return `${baseClasses} bg-[#232323]/90 border-[#1DB954]/50 hover:border-[#1DB954] hover:bg-[#1DB954]/10`;
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label className={`flex items-center gap-3 cursor-pointer select-none group ${disabled ? 'cursor-not-allowed' : ''} ${className}`}>
      <div className={getCheckboxClasses()} onClick={handleClick}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label || 'Checkbox'}
        />
        {(checked || indeterminate) && (
          <svg 
            className={`absolute inset-0 w-full h-full text-white ${iconSizes[size]} animate-scale-in`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {indeterminate && !checked ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M5 12h14"
                className="animate-checkmark"
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M5 13l4 4L19 7"
                className="animate-checkmark"
              />
            )}
          </svg>
        )}
      </div>
      {label && (
        <span className={`text-sm font-medium transition-colors ${
          disabled 
            ? 'text-gray-500' 
            : 'text-white group-hover:text-[#1DB954]'
        }`}>
          {label}
        </span>
      )}
    </label>
  );
} 