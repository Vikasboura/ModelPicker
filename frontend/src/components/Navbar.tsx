import React, { useEffect, useState } from 'react';
import {
  Layers,
  BarChart3,
  Cpu,
  PlayCircle,
  Database,
  History,
  Terminal,
  AlertTriangle,
  Compass,
  Cloud,
  HardDrive,
} from 'lucide-react';
import { api } from '../services/api';
import type { InferenceMode, SystemHealth } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [mode, setMode] = useState<InferenceMode>(api.getMode());

  const checkHealth = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    const onModeChange = () => {
      setMode(api.getMode());
      checkHealth();
    };
    window.addEventListener('modelpicker_mode_changed', onModeChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('modelpicker_mode_changed', onModeChange);
    };
  }, []);

  const handleToggleMode = (newMode: InferenceMode) => {
    api.setMode(newMode);
    setMode(newMode);
    checkHealth();
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Compass },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'benchmark', label: 'Benchmark', icon: PlayCircle },
    { id: 'runs', label: 'History', icon: History },
    { id: 'datasets', label: 'Datasets', icon: Database },
    { id: 'playground', label: 'Playground', icon: Terminal },
  ];

  return (
    <header className="border-b border-dark-800 bg-dark-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => onSelectTab('overview')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">ModelPicker</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">LLM Evaluation & Decision Engine</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-dark-800 text-brand-400 border border-dark-700/60 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-dark-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Status & Mode Toggle */}
          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-dark-950 border border-dark-800 text-xs">
              <button
                type="button"
                onClick={() => handleToggleMode('public')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
                  mode === 'public'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Use free cloud inference (Groq / Open-Weight)"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Public Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode('local')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
                  mode === 'local'
                    ? 'bg-dark-800 text-brand-400 border border-dark-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Connect to local Ollama on localhost:11434"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Local Ollama</span>
              </button>
            </div>

            {/* Serving Status Indicator */}
            {mode === 'public' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="hidden sm:inline">Free Cloud</span>
              </div>
            ) : health?.ollama?.available ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">Ollama Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ollama Offline</span>
              </div>
            )}

            {/* GitHub Repo Link */}
            <a
              href="https://github.com/Vikasboura/modelpicker"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white border border-dark-700/60 transition"
              title="View repository on GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="lg:hidden border-t border-dark-800 px-2 py-2 flex items-center justify-around bg-dark-900 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded text-[11px] font-medium shrink-0 ${
                isActive ? 'text-brand-400 bg-dark-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
