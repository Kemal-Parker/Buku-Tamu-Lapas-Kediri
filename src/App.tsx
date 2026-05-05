/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router';
import DashboardPage from './pages/DashboardPage';
import CheckInPage from './pages/CheckInPage';
import HistoryPage from './pages/HistoryPage';
import QRCodePage from './pages/QRCodePage';
import { LayoutDashboard, History, QrCode, ClipboardList } from 'lucide-react';
import { useEffect } from 'react';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Riwayat Tamu', path: '/history', icon: History },
    { name: 'Generate QR', path: '/qr', icon: QrCode },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            Buku Tamu LAPAS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Kelas 2A Kediri</p>
        </div>
        <nav className="mt-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/checkin" element={<CheckInPage />} />
        
        {/* Admin Routes */}
        <Route path="/" element={<AdminLayout><DashboardPage /></AdminLayout>} />
        <Route path="/history" element={<AdminLayout><HistoryPage /></AdminLayout>} />
        <Route path="/qr" element={<AdminLayout><QRCodePage /></AdminLayout>} />
      </Routes>
    </Router>
  );
}
