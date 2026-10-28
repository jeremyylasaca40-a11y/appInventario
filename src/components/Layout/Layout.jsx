import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('senati_theme') === 'dark');
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('senati_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('senati_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Obtener usuario autenticado real
  let currentUser = { nombre: 'Usuario SENATI', rol: 'Almacenero', email: '' };
  try {
    const stored = localStorage.getItem('senati_user');
    if (stored && stored !== 'undefined') {
      currentUser = JSON.parse(stored);
    }
  } catch (e) {
    console.error(e);
  }

  const handleLogout = () => {
    localStorage.removeItem('senati_user');
    window.location.href = '/login';
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'Inicio (Dashboard Ejecutivo)';
      case '/productos':
        return 'Gestión de Productos';
      case '/categorias':
        return 'Categorías de Inventario';
      case '/proveedores':
        return 'Directorio de Proveedores';
      case '/kardex':
        return 'Kardex / Movimientos Atómicos';
      case '/usuarios':
        return 'Gestión de Usuarios y Roles';
      default:
        return 'Sistema de Inventario';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`layout-container ${darkMode ? 'dark-mode' : ''}`}>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Lateral */}
      <aside className={`layout-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="senati-badge">
            <span className="senati-s">S</span>
            <span className="senati-text">SENATI</span>
          </div>
          <div className="system-title">Sistema de Inventario • 2026</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">PANEL PRINCIPAL</div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Inicio (Dashboard)</span>
          </NavLink>

          <div className="nav-section-label">CATÁLOGO Y STOCK</div>
          <NavLink
            to="/productos"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">📦</span>
            <span className="nav-text">Productos</span>
          </NavLink>

          <NavLink
            to="/categorias"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">🏷️</span>
            <span className="nav-text">Categorías</span>
          </NavLink>

          <NavLink
            to="/proveedores"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">🚚</span>
            <span className="nav-text">Proveedores</span>
          </NavLink>

          <div className="nav-section-label">OPERACIONES</div>
          <NavLink
            to="/kardex"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">🔄</span>
            <span className="nav-text">Kardex / Movimientos</span>
          </NavLink>

          <div className="nav-section-label">ADMINISTRACIÓN</div>
          <NavLink
            to="/usuarios"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-text">Usuarios</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="connection-badge">
            <span className="pulse-dot"></span>
            <span>MySQL 8 Conectado (3307)</span>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="layout-main">
        {/* Top Navbar */}
        <header className="layout-topbar">
          <div className="topbar-left">
            <button className="menu-toggle-btn" onClick={toggleSidebar}>
              ☰
            </button>
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>

          <div className="topbar-right">
            {/* Dark Mode Toggle */}
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
            </button>

            {/* Perfil de Usuario */}
            <div className="user-profile">
              <div className="user-avatar">{getInitials(currentUser.nombre)}</div>
              <div className="user-info">
                <span className="user-name">{currentUser.nombre}</span>
                <span className="user-role">{currentUser.rol}</span>
              </div>
            </div>

            {/* Cerrar Sesión */}
            <button
              className="logout-btn"
              onClick={handleLogout}
              title="Cerrar Sesión y volver al Login"
            >
              <span>🚪</span> Salir
            </button>
          </div>
        </header>

        {/* Contenido de la Ruta */}
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
