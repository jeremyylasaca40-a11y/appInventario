import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import './Usuarios.css';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [form, setForm] = useState({
    id: null,
    nombre: '',
    email: '',
    password: '',
    rol: 'Almacenero'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      showToast('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpenModal = (usu = null) => {
    if (usu) {
      setForm({
        id: usu.id,
        nombre: usu.nombre,
        email: usu.email,
        password: '',
        rol: usu.rol
      });
    } else {
      setForm({
        id: null,
        nombre: '',
        email: '',
        password: 'password123',
        rol: 'Almacenero'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/api/usuarios/${form.id}`, form);
        showToast('Usuario actualizado correctamente');
      } else {
        await api.post('/api/usuarios', form);
        showToast('Nuevo usuario creado exitosamente');
      }
      setShowModal(false);
      cargarUsuarios();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar usuario', 'error');
    }
  };

  const handleToggleEstado = async (id, nombre, estadoActual) => {
    try {
      await api.patch(`/api/usuarios/${id}/toggle-estado`);
      showToast(`Estado de "${nombre}" cambiado a ${!estadoActual ? 'Activo' : 'Inactivo'}`);
      cargarUsuarios();
    } catch (err) {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleDelete = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar al usuario "${nombre}"?`)) {
      try {
        await api.delete(`/api/usuarios/${id}`);
        showToast('Usuario eliminado', 'info');
        cargarUsuarios();
      } catch (err) {
        showToast('Error al eliminar usuario', 'error');
      }
    }
  };

  const filtered = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.rol?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="view-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="view-header">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Nombre, Email o Rol..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <span>+</span> Nuevo Usuario
        </button>
      </div>

      <div className="table-card">
        <div className="table-card-title">
          <h3>Control de Usuarios y Accesos</h3>
          <span className="count-badge">{filtered.length} usuarios registrados</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">Cargando...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">No se encontraron usuarios.</td>
                </tr>
              ) : (
                currentItems.map((u) => (
                  <tr key={u.id}>
                    <td className="text-muted font-mono">{String(u.id).padStart(3, '0')}</td>
                    <td className="font-semibold">
                      <div className="user-name-cell">
                        <span className="user-circle-initial">
                          {u.nombre.charAt(0).toUpperCase()}
                        </span>
                        <span>{u.nombre}</span>
                      </div>
                    </td>
                    <td className="text-sm text-muted">{u.email}</td>
                    <td>
                      <span className={`role-badge role-${u.rol.toLowerCase()}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`status-toggle-btn ${u.estado ? 'status-active' : 'status-inactive'}`}
                        onClick={() => handleToggleEstado(u.id, u.nombre, u.estado)}
                        title="Click para cambiar estado"
                      >
                        <span className="status-dot"></span>
                        {u.estado ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="text-center">
                      <div className="action-buttons">
                        <button className="btn-action btn-edit" onClick={() => handleOpenModal(u)}>
                          ✏️ Editar
                        </button>
                        <button className="btn-action btn-delete" onClick={() => handleDelete(u.id, u.nombre)}>
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} usuarios
            </span>
            <div className="pagination-controls">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>‹</button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={currentPage === i + 1 ? 'active' : ''}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{form.id ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Mario Antonio Ruiz"
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="usuario@senati.pe"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{form.id ? 'Nueva Contraseña (Opcional)' : 'Contraseña *'}</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!form.id}
                    placeholder="••••••••"
                  />
                </div>

                <div className="form-group">
                  <label>Rol de Usuario *</label>
                  <select name="rol" value={form.rol} onChange={handleChange} required>
                    <option value="Administrador">Administrador</option>
                    <option value="Almacenero">Almacenero</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {form.id ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
