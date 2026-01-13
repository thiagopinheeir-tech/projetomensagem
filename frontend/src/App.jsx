import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Profile from './pages/Profile';
import ChatbotSettings from './pages/ChatbotSettings';
import APIManager from './pages/APIManager';
import CRM from './pages/CRM';
import WhatsAppConnection from './pages/WhatsAppConnection';
import { useAuth } from './hooks/useAuth';

// Componente de rota protegida
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Inicializar tema dark mode
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg, #fff)',
              color: 'var(--toast-color, #333)',
            },
            success: {
              iconTheme: {
                primary: '#3B82F6',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          {/* Rota pública - Login */}
          <Route
            path="/login"
            element={
              localStorage.getItem('token') ? <Navigate to="/" replace /> : <Login />
            }
          />

          {/* Rotas protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                      onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      isSidebarOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Dashboard />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/conversations"
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                      onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      isSidebarOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Conversations />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                      onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      isSidebarOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <ChatbotSettings />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/api-manager"
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                      onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      isSidebarOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <APIManager />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                      onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      isSidebarOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <Profile />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                      onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      isSidebarOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <CRM />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/whatsapp-connection"
            element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar
                      onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      isSidebarOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                      <WhatsAppConnection />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Rota padrão - redirecionar para dashboard ou login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
