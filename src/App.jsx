import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import Productos from './components/Productos/Productos';
import Categorias from './components/Categorias/Categorias';
import Proveedores from './components/Proveedores/Proveedores';
import Kardex from './components/Kardex/Kardex';
import Usuarios from './components/Usuarios/Usuarios';
import Login from './components/Login/Login';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Routes>
      {/* Ruta Pública: Login */}
      <Route path="/login" element={<Login />} />

      {/* Rutas Protegidas: Requieren Login */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="productos" element={<Productos />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="kardex" element={<Kardex />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      {/* Si la ruta no existe, enviar al Login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
