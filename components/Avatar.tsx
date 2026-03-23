import React from 'react';

export const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => {
    const initials = (name || '')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    
    const colors = [
        'bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 
        'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'
    ];
    
    const colorIndex = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const color = colors[colorIndex];

    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${color} ${className} flex-shrink-0`}>
            {initials}
        </div>
    );
};

export default Avatar;
