import React, { useState } from 'react';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import './Login.css';

const Login = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRol, setRegRol] = useState('Almacenero');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast('Por favor completa todos los campos');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/api/auth/login', {
        email: loginEmail,
        password: loginPassword
      });
      localStorage.setItem('senati_user', JSON.stringify(res.data.usuario));
      showToast('¡Bienvenido/a al Sistema!', 'success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 500);
    } catch (err) {
      showToast(err.response?.data?.error || 'Credenciales incorrectas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regNombre || !regEmail || !regPassword) {
      showToast('Por favor completa todos los campos para el registro');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/api/auth/register', {
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        rol: regRol
      });
      localStorage.setItem('senati_user', JSON.stringify(res.data.usuario));
      showToast('¡Cuenta creada exitosamente!', 'success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 600);
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al registrar usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setActiveTab('login');
  };

  const features = [
    { icon: '📦', title: 'Gestión de Inventario', desc: 'Control total de stock y productos' },
    { icon: '📊', title: 'Dashboard Analítico', desc: 'Gráficos y KPIs en tiempo real' },
    { icon: '🔄', title: 'Kardex de Movimientos', desc: 'Trazabilidad de entradas y salidas' },
    { icon: '🔐', title: 'Seguridad Bcrypt', desc: 'Contraseñas encriptadas y roles' },
  ];

  return (
    <div className="login-page">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Background layers */}
      <div className="login-bg" />
      <div className="login-grid" />

      {/* Split layout */}
      <div className="login-split">

        {/* ── LEFT: Branding Panel ── */}
        <div className="login-left">
          {/* Logo */}
          <div className="login-brand-badge">
            <div className="brand-logo-box">S</div>
            <span className="brand-name">SENATI</span>
          </div>

          {/* Headline */}
          <div className="login-left-headline">
            <h1>
              Sistema de{' '}
              <span className="headline-highlight">Inventario</span>
              <br />
              Inteligente
            </h1>
            <p>
              Administra tu almacén con eficiencia. Controla stock,
              proveedores y movimientos desde un solo panel.
            </p>
          </div>

          {/* Feature list */}
          <div className="login-features">
            {features.map((f, i) => (
              <div className="feature-item" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom status */}
          <div className="left-bottom-badge">
            <span className="status-dot" />
            Servidor activo • Versión 2.0 • SENATI 2026
          </div>
        </div>

        {/* ── RIGHT: Form Panel ── */}
        <div className="login-right">
          <div className="login-card">

            {/* Card header */}
            <div className="login-header">
              <div className="login-header-top">
                <div className="login-avatar-icon">🔑</div>
                <div>
                  <h2 className="login-title">Control de Acceso</h2>
                  <p className="login-subtitle">Ingresa tus credenciales para continuar</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="login-tabs">
              <button
                type="button"
                id="tab-login"
                className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                id="tab-register"
                className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                + Nuevo Usuario
              </button>
            </div>

            {/* ── LOGIN FORM ── */}
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="login-form" id="form-login">
                <div className="login-field">
                  <label htmlFor="login-email">Correo Electrónico</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">✉️</span>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="ejemplo@senati.pe"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="login-password">Contraseña</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading && <span className="btn-spinner" />}
                  <span>{loading ? 'Verificando credenciales...' : 'Ingresar al Sistema →'}</span>
                </button>

                {/* Demo accounts */}
                <div className="demo-accounts-box">
                  <span className="demo-title">⚡ Acceso rápido — Evaluación docente</span>
                  <div className="demo-buttons">
                    <button
                      type="button"
                      id="demo-admin"
                      className="demo-btn"
                      onClick={() => setDemoCredentials('gbarboza@senati.pe', 'password123')}
                    >
                      👑 Giancarlos Barboza
                      <span className="demo-btn-role">Admin</span>
                    </button>
                    <button
                      type="button"
                      id="demo-almacenero"
                      className="demo-btn"
                      onClick={() => setDemoCredentials('mruiz@inventario.com', 'password123')}
                    >
                      📦 Mario Ruiz
                      <span className="demo-btn-role">Almacenero</span>
                    </button>
                    <button
                      type="button"
                      id="demo-supervisor"
                      className="demo-btn"
                      onClick={() => setDemoCredentials('srojas@inventario.com', 'password123')}
                    >
                      🔍 Sofia Rojas
                      <span className="demo-btn-role">Supervisor</span>
                    </button>
                  </div>
                </div>
              </form>

            ) : (
              /* ── REGISTER FORM ── */
              <form onSubmit={handleRegisterSubmit} className="login-form" id="form-register">
                <div className="login-field">
                  <label htmlFor="reg-nombre">Nombre y Apellidos</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">👤</span>
                    <input
                      id="reg-nombre"
                      type="text"
                      placeholder="Ej. Juan Pérez García"
                      value={regNombre}
                      onChange={(e) => setRegNombre(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="reg-email">Correo Electrónico</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">✉️</span>
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="usuario@senati.pe"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="reg-rol">Rol en el Sistema</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">🏷️</span>
                    <select
                      id="reg-rol"
                      value={regRol}
                      onChange={(e) => setRegRol(e.target.value)}
                      className="login-select"
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Almacenero">Almacenero</option>
                      <option value="Supervisor">Supervisor</option>
                    </select>
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="reg-password">Contraseña</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="reg-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', paddingLeft: '4px' }}>
                    🔐 Encriptada automáticamente con Bcrypt
                  </span>
                </div>

                <button
                  id="btn-register-submit"
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading && <span className="btn-spinner" />}
                  <span>{loading ? 'Creando cuenta...' : 'Crear Cuenta y Entrar →'}</span>
                </button>
              </form>
            )}

            <div className="login-footer">
              Seminario Fullstack Developer &nbsp;•&nbsp; SENATI 2026
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
