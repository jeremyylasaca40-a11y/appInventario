import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import './Categorias.css';

const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Formulario
  const [form, setForm] = useState({ id: null, nombre: '', descripcion: '' });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    cargarCategorias();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/categorias');
      setCategorias(res.data);
    } catch (err) {
      showToast('Error al cargar categorías', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setForm({ id: cat.id, nombre: cat.nombre, descripcion: cat.descripcion || '' });
    } else {
      setForm({ id: null, nombre: '', descripcion: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/api/categorias/${form.id}`, form);
        showToast('Categoría actualizada con éxito');
      } else {
        await api.post('/api/categorias', form);
        showToast('Nueva categoría creada con éxito');
      }
      setShowModal(false);
      cargarCategorias();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar categoría', 'error');
    }
  };

  const handleDelete = async (id, nombre) => {
    if (window.confirm(`¿Deseas eliminar la categoría "${nombre}"?`)) {
      try {
        await api.delete(`/api/categorias/${id}`);
        showToast('Categoría eliminada', 'info');
        cargarCategorias();
      } catch (err) {
        showToast('Error al eliminar categoría', 'error');
      }
    }
  };

  const filtered = categorias.filter((c) => {
    const term = searchTerm.toLowerCase();
    return c.nombre?.toLowerCase().includes(term) || c.descripcion?.toLowerCase().includes(term);
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
            placeholder="Buscar por Nombre de categoría..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <span>+</span> Nueva Categoría
        </button>
      </div>

      <div className="table-card">
        <div className="table-card-title">
          <h3>Lista de Categorías</h3>
          <span className="count-badge">{filtered.length} registradas</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Cant. Productos</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">Cargando...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">No hay categorías registradas.</td>
                </tr>
              ) : (
                currentItems.map((c) => (
                  <tr key={c.id}>
                    <td className="text-muted font-mono">{String(c.id).padStart(3, '0')}</td>
                    <td className="font-semibold">{c.nombre}</td>
                    <td className="text-muted text-sm">{c.descripcion || 'Sin descripción'}</td>
                    <td>
                      <span className="count-pill">{c.total_productos || 0} artículos</span>
                    </td>
                    <td className="text-center">
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-edit"
                          onClick={() => handleOpenModal(c)}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDelete(c.id, c.nombre)}
                        >
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
              {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} categorías
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
              <h3>{form.id ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nombre de la Categoría *</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Periféricos, Laptops..."
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Detalles sobre qué artículos agrupa esta categoría..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {form.id ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categorias;
