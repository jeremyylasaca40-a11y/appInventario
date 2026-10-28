import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import './Proveedores.css';

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [form, setForm] = useState({
    id: null,
    razon_social: '',
    contacto: '',
    telefono: '',
    email: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    cargarProveedores();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/proveedores');
      setProveedores(res.data);
    } catch (err) {
      showToast('Error al cargar proveedores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpenModal = (prov = null) => {
    if (prov) {
      setForm({
        id: prov.id,
        razon_social: prov.razon_social,
        contacto: prov.contacto || '',
        telefono: prov.telefono || '',
        email: prov.email || ''
      });
    } else {
      setForm({ id: null, razon_social: '', contacto: '', telefono: '', email: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/api/proveedores/${form.id}`, form);
        showToast('Proveedor actualizado exitosamente');
      } else {
        await api.post('/api/proveedores', form);
        showToast('Nuevo proveedor registrado con éxito');
      }
      setShowModal(false);
      cargarProveedores();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar proveedor', 'error');
    }
  };

  const handleDelete = async (id, razon) => {
    if (window.confirm(`¿Seguro que deseas eliminar al proveedor "${razon}"?`)) {
      try {
        await api.delete(`/api/proveedores/${id}`);
        showToast('Proveedor eliminado', 'info');
        cargarProveedores();
      } catch (err) {
        showToast('Error al eliminar proveedor', 'error');
      }
    }
  };

  const filtered = proveedores.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.razon_social?.toLowerCase().includes(term) ||
      p.contacto?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term)
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
            placeholder="Buscar por Razón Social o Contacto..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <span>+</span> Nuevo Proveedor
        </button>
      </div>

      <div className="table-card">
        <div className="table-card-title">
          <h3>Lista de Proveedores</h3>
          <span className="count-badge">{filtered.length} proveedores aliados</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Razón Social</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Email</th>
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
                  <td colSpan="6" className="text-center py-4 text-muted">No se encontraron proveedores.</td>
                </tr>
              ) : (
                currentItems.map((p) => (
                  <tr key={p.id}>
                    <td className="text-muted font-mono">{String(p.id).padStart(3, '0')}</td>
                    <td className="font-semibold">{p.razon_social}</td>
                    <td>{p.contacto || '-'}</td>
                    <td className="font-mono text-sm">{p.telefono || '-'}</td>
                    <td className="text-sm text-muted">{p.email || '-'}</td>
                    <td className="text-center">
                      <div className="action-buttons">
                        <button className="btn-action btn-edit" onClick={() => handleOpenModal(p)}>
                          ✏️ Editar
                        </button>
                        <button className="btn-action btn-delete" onClick={() => handleDelete(p.id, p.razon_social)}>
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
              {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} proveedores
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
              <h3>{form.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Razón Social / Empresa *</label>
                <input
                  type="text"
                  name="razon_social"
                  value={form.razon_social}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Logitech Perú S.A.C."
                />
              </div>
              <div className="form-group">
                <label>Persona de Contacto</label>
                <input
                  type="text"
                  name="contacto"
                  value={form.contacto}
                  onChange={handleChange}
                  placeholder="Ej. Carlos Mendoza"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="Ej. 987 654 321"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {form.id ? 'Guardar Cambios' : 'Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proveedores;
