
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl flex flex-col relative overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Splitify <span className="text-indigo-200 text-sm">Beta</span></h1>
        <div className="flex gap-4">
          <i className="fa-solid fa-bell text-lg opacity-80 cursor-pointer"></i>
          <i className="fa-solid fa-gear text-lg opacity-80 cursor-pointer"></i>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-around py-4 px-6 fixed bottom-0 max-w-md w-full z-40">
        <NavItem 
          icon="fa-layer-group" 
          label="Groups" 
          active={activeTab === 'Groups'} 
          onClick={() => onTabChange('Groups')}
        />
        <NavItem 
          icon="fa-user-friends" 
          label="Friends" 
          active={activeTab === 'Friends'} 
          onClick={() => onTabChange('Friends')}
        />
        <NavItem 
          icon="fa-chart-pie" 
          label="Analysis" 
          active={activeTab === 'Analysis'} 
          onClick={() => onTabChange('Analysis')}
        />
        <NavItem 
          icon="fa-user" 
          label="Profile" 
          active={activeTab === 'Profile'} 
          onClick={() => onTabChange('Profile')}
        />
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 transform ${active ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-400'}`}
  >
    <i className={`fa-solid ${icon} text-lg`}></i>
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

export default Layout;
