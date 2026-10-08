import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { ModelsPage } from './pages/ModelsPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { RunsHistoryPage } from './pages/RunsHistoryPage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { PlaygroundPage } from './pages/PlaygroundPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Sync with browser hash / path
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/^\//, '');
      if (path.startsWith('runs/')) {
        const id = path.replace('runs/', '');
        setSelectedRunId(id);
        setCurrentTab('run_details');
      } else if (['models', 'benchmark', 'runs', 'datasets', 'playground'].includes(path)) {
        setCurrentTab(path);
      } else {
        setCurrentTab('dashboard');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (tab: string, runId?: string) => {
    if (tab === 'run_details' && runId) {
      setSelectedRunId(runId);
      setCurrentTab('run_details');
      window.history.pushState({}, '', `/runs/${runId}`);
    } else {
      setSelectedRunId(null);
      setCurrentTab(tab);
      window.history.pushState({}, '', tab === 'dashboard' ? '/' : `/${tab}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans">
      <Navbar currentTab={currentTab === 'run_details' ? 'runs' : currentTab} onSelectTab={(tab) => navigateTo(tab)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            onNavigateToBenchmark={() => navigateTo('benchmark')}
            onNavigateToRun={(runId) => navigateTo('run_details', runId)}
          />
        )}

        {currentTab === 'models' && <ModelsPage />}

        {currentTab === 'benchmark' && (
          <BenchmarkPage
            onNavigateToRun={(runId) => navigateTo('run_details', runId)}
          />
        )}

        {currentTab === 'runs' && (
          <RunsHistoryPage
            onNavigateToRun={(runId) => navigateTo('run_details', runId)}
            onNavigateToBenchmark={() => navigateTo('benchmark')}
          />
        )}

        {currentTab === 'run_details' && selectedRunId && (
          <RunDetailsPage
            runId={selectedRunId}
            onBack={() => navigateTo('runs')}
          />
        )}

        {currentTab === 'datasets' && <DatasetsPage />}

        {currentTab === 'playground' && <PlaygroundPage />}
      </main>

      <footer className="border-t border-dark-900 bg-dark-950/80 py-6 text-center text-xs text-slate-500">
        <p>ModelPicker • Local Open-Weight LLM Inference & Benchmark Platform</p>
      </footer>
    </div>
  );
};

export default App;
