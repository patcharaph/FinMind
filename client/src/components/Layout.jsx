import React from 'react';
import { LayoutDashboard, PenLine, BrainCircuit, History } from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${active ? 'text-finmind-primary' : 'text-finmind-muted hover:text-finmind-text'
            }`}
    >
        <Icon size={24} />
        <span className="text-xs font-medium">{label}</span>
    </button>
);

const Layout = ({ children, currentTab, onTabChange }) => {
    return (
        <div className="flex flex-col min-h-screen bg-finmind-background text-finmind-text pb-20 sm:pb-0">
            <main className="flex-1 w-full max-w-md mx-auto p-4 sm:p-6 sm:max-w-2xl">
                {children}
            </main>

            {/* Bottom Navigation for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-finmind-card/90 backdrop-blur-md border-t border-slate-700/50 sm:hidden">
                <div className="flex items-center justify-around h-full max-w-md mx-auto">
                    <NavItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={currentTab === 'dashboard'}
                        onClick={() => onTabChange('dashboard')}
                    />
                    <NavItem
                        icon={PenLine}
                        label="Input Data"
                        active={currentTab === 'input'}
                        onClick={() => onTabChange('input')}
                    />
                    <NavItem
                        icon={BrainCircuit}
                        label="AI Advisor"
                        active={currentTab === 'advisor'}
                        onClick={() => onTabChange('advisor')}
                    />
                    <NavItem
                        icon={History}
                        label="History"
                        active={currentTab === 'history'}
                        onClick={() => onTabChange('history')}
                    />
                </div>
            </div>
        </div>
    );
};

export default Layout;
