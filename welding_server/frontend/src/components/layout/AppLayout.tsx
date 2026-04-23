import React from 'react'
import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  logout: () => Promise<void>;
  permissions: any;
  version: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  logout,
  permissions,
  version
}) => {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        logout={logout}
        permissions={permissions}
        version={version}
      />
      <main className="flex-1 overflow-auto bg-slate-950">
        {children}
      </main>
    </div>
  )
}

export default AppLayout
