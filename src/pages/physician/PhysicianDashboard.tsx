import React, { useState } from "react";
import PatientOverview from "./PatientOverview";
import Alerts from "./Alerts";
import Reports from "./Reports";
import PhysicianSettings from "./PhysicianSettings";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";

const PatientsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const AlertsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ReportsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

type Page = "patients" | "alerts" | "reports" | "settings";

const PhysicianDashboard = () => {
  const [activePage, setActivePage] = useState<Page>("patients");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();

  const navItems = [
    { id: "patients" as Page, label: "Patients", icon: <PatientsIcon />, badge: null },
    { id: "alerts" as Page, label: "Alerts", icon: <AlertsIcon />, badge: null },
    { id: "reports" as Page, label: "Reports", icon: <ReportsIcon />, badge: null },
    { id: "settings" as Page, label: "Settings", icon: <SettingsIcon />, badge: null },
  ];

  const renderPage = () => {
    switch (activePage) {
      case "patients": return <PatientOverview />;
      case "alerts": return <Alerts />;
      case "reports": return <Reports />;
      case "settings": return <PhysicianSettings />;
    }
  };

  const handleSignOut = async () => {
    await signOut(getAuth());
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className={`${sidebarOpen ? "w-64" : "w-16"} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {sidebarOpen && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Navigation</p>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                activePage === item.id ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              {item.icon}
              {sidebarOpen && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "DR"}
              </span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || "Provider"}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={handleSignOut}
              className="mt-3 w-full text-xs text-red-400 border border-red-200 py-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  );
};

export default PhysicianDashboard;
