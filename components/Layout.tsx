
import React from 'react';
import { getAssetPath } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl shadow-slate-200 flex flex-col relative overflow-hidden font-sans border-x border-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900">Splitify <span className="text-brand-500 text-sm font-sans font-medium bg-brand-50 px-2 py-0.5 rounded-full">Beta</span></h1>
        <div className="flex gap-4">
          <button className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-bell text-slate-600 text-lg"></i>
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
            <img src={getAssetPath('/avatars/default.jpg')} className="w-full h-full object-cover opacity-80" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around py-4 px-6 fixed bottom-0 max-w-md w-full z-40 pb-8">
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
    className={`flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-300 transform ${active ? 'text-brand-600 scale-105' : 'text-slate-400 hover:text-brand-400'}`}
  >
    <div className={`text-xl transition-all ${active ? 'animate-bounce-short' : ''}`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${active ? 'text-brand-600' : 'text-slate-400'}`}>{label}</span>
  </button>
);

export default Layout;
