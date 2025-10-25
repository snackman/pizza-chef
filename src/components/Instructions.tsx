import React from 'react';
import { Pizza, Keyboard } from 'lucide-react';

const Instructions: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-4 rounded-lg border-2 border-orange-300 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <Pizza className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-bold text-gray-800">How to Play Pizza Chef</h3>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Keyboard className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">Controls:</span>
          </div>
          <ul className="space-y-1 ml-6">
            <li>• Use <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">↑</kbd> <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">↓</kbd> to move chef between counters</li>
            <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">←</kbd> or <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Space</kbd> to use oven (cook/take out pizza)</li>
            <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">→</kbd> to serve pizza slice</li>
            <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">P</kbd> to pause game</li>
          </ul>
        </div>
        
        <div>
          <span className="font-semibold">Gameplay:</span>
          <ul className="space-y-1 ml-4 mt-2">
            <li>• Heat slices in ovens (3 seconds)</li>
            <li>• You can hold up to 8 slices at a time</li>
            <li>• Serve hungry customers before they reach you</li>
            <li>• Don't let slices burn in the oven!</li>
            <li>• Advance levels by increasing your score</li>
            <li>• Catch empty plates for bonus points</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Instructions;