import React from 'react';
import Icon from './Icon';

const AccessDenied: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white dark:bg-gray-800/50 rounded-xl">
        <Icon name="access-denied" className="w-16 h-16 text-red-500" />

        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
            You do not have the required permissions to view this page.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This area is restricted to Admin users.
        </p>
    </div>
  );
};

export default AccessDenied;
