
import React, { useState } from 'react';
import { StudioTab } from './types';
import { ICONS } from './constants';
import ChatView from './components/ChatView';
import ImageView from './components/ImageView';
import VideoView from './components/VideoView';
import LiveView from './components/LiveView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTab>('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return <ChatView />;
      case 'image': return <ImageView />;
      case 'video': return <VideoView />;
      case 'live': return <LiveView />;
      default: return <ChatView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <span className="font-bold text-xl text-white">G</span>
          </div>
          <span className="hidden md:block font-bold text-lg tracking-tight">Gemini Studio</span>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <NavItem 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={<ICONS.Chat />} 
            label="AI Chat" 
          />
          <NavItem 
            active={activeTab === 'image'} 
            onClick={() => setActiveTab('image')} 
            icon={<ICONS.Image />} 
            label="Image Gen" 
          />
          <NavItem 
            active={activeTab === 'video'} 
            onClick={() => setActiveTab('video')} 
            icon={<ICONS.Video />} 
            label="Video Gen" 
          />
          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavItem 
              active={activeTab === 'live'} 
              onClick={() => setActiveTab('live')} 
              icon={<ICONS.Live />} 
              label="Go Live" 
              special
            />
          </div>
        </nav>

        <div className="p-6">
          <div className="hidden md:block bg-slate-800/50 p-4 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Model Status</p>
            <p className="text-sm font-medium text-emerald-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Operational
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        <header className="h-16 border-b border-slate-800/50 flex items-center px-8 justify-between backdrop-blur-md bg-slate-950/50 z-10">
          <h1 className="text-xl font-bold text-white capitalize">{activeTab} Studio</h1>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400">
               {process.env.API_KEY ? 'Key: Linked' : 'Key: Missing'}
             </div>
             <button className="p-2 text-slate-400 hover:text-white transition-colors">
               <ICONS.Settings />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  special?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label, special }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
        active 
          ? (special ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-white border border-slate-700') 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <span className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
        {icon}
      </span>
      <span className="hidden md:block font-medium">{label}</span>
    </button>
  );
};

export default App;
