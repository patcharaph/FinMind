import React, { useState, useEffect } from 'react';
import useStore from './store/useStore';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import InputPage from './pages/InputPage';
import AdvisorPage from './pages/AdvisorPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const fetchSnapshots = useStore((s) => s.fetchSnapshots);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
      {currentTab === 'input' && <InputPage onNavigate={setCurrentTab} />}
      {currentTab === 'advisor' && <AdvisorPage onNavigate={setCurrentTab} />}
      {currentTab === 'history' && <HistoryPage />}
    </Layout>
  );
}

export default App;
