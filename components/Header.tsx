import React from 'react';
import { Palette, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Palette className="w-8 h-8 text-pink-500 absolute -left-1 -top-1 opacity-70" />
            <Cpu className="w-8 h-8 text-cyan-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-graffiti text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
              NeuralGraffiti
            </h1>
            <p className="text-xs font-code text-gray-400 tracking-wider">
              EST. 2025 // NANO.BANANA.LABS
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <span className="font-code text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
            SYSTEM: ONLINE
          </span>
        </div>
      </div>
    </header>
  );
};
