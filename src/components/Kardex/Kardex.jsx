import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import './Kardex.css';

const Kardex = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Formulario de Transacción Kardex
  const [form, setForm] = useState({
    producto_id: '',
    usuario_id: '',
    tipo_movimiento: 'Entrada',
    cantidad: '',
    observaciones: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    cargarDatos();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resMov, resProd, resUsu] = await Promise.all([
        api.get('/api/movimientos'),
        api.get('/api/productos'),
        api.get('/api/usuarios')
      ]);
      setMovimientos(resMov.data);
      setProductos(resProd.data);
      setUsuarios(resUsu.data);
      if (resProd.data.length > 0 && !form.producto_id) {
        setForm((prev) => ({
          ...prev,
          producto_id: resProd.data[0].id,
          usuario_id: resUsu.data[0]?.id || ''
        }));
      }
    } catch (err) {
      showToast('Error al cargar datos del Kardex', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpenModal = () => {
    setForm({
      producto_id: productos[0]?.id || '',
      usuario_id: usuarios[0]?.id || '',
      tipo_movimiento: 'Entrada',
      cantidad: '',
      observaciones: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/movimientos', form);
      showToast(`¡Movimiento registrado! Nuevo stock: ${res.data.nuevo_stock} uds`);
      setShowModal(false);
      cargarDatos();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al procesar movimiento', 'error');
    }
  };

  // Producto seleccionado para calcular proyección de stock
  const selectedProduct = productos.find((p) => p.id === parseInt(form.producto_id, 10));
  let projectedStock = null;
  if (selectedProduct && form.cantidad) {
    const qty = parseInt(form.cantidad, 10) || 0;
    if (form.tipo_movimiento === 'Entrada') projectedStock = selectedProduct.stock + qty;
    if (form.tipo_movimiento === 'Salida') projectedStock = selectedProduct.stock - qty;
    if (form.tipo_movimiento === 'Ajuste') projectedStock = qty;
  }

  // Filtrado
  const filtered = movimientos.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchProd = m.producto?.nombre?.toLowerCase().includes(term);
    const matchUser = m.usuario?.nombre?.toLowerCase().includes(term);
    const matchObs = m.observaciones?.toLowerCase().includes(term);
    const matchTipo = filterTipo ? m.tipo_movimiento === filterTipo : true;
    return (matchProd || matchUser || matchObs) && matchTipo;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="view-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="view-header">
        <div className="filter-group">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar por Producto, Usuario u Observación..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select
            className="filter-select"
            value={filterTipo}
            onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todos los tipos</option>
            <option value="Entrada">Solo Entradas</option>
            <option value="Salida">Solo Salidas</option>
            <option value="Ajuste">Solo Ajustes</option>
          </select>
        </div>

        <button className="btn-primary" onClick={handleOpenModal}>
          <span>🔄</span> Registrar Movimiento
        </button>
      </div>

      <div className="table-card">
        <div className="table-card-title">
          <h3>Lista de Movimientos (Kardex)</h3>
          <span className="count-badge">{filtered.length} transacciones registradas</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha / Hora</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">Cargando Kardex...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">No se encontraron movimientos.</td>
                </tr>
              ) : (
                currentItems.map((m) => (
                  <tr key={m.id}>
                    <td className="text-muted font-mono">{String(m.id).padStart(3, '0')}</td>
                    <td className="text-muted text-sm">
                      {new Date(m.fecha_hora).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="font-semibold">{m.producto?.nombre || 'Producto eliminado'}</td>
                    <td>
                      <span className={`badge-pill badge-${m.tipo_movimiento.toLowerCase()}`}>
                        {m.tipo_movimiento}
                      </span>
                    </td>
                    <td className="font-bold">
                      {m.tipo_movimiento === 'Entrada' && <span className="text-success">+{m.cantidad}</span>}
                      {m.tipo_movimiento === 'Salida' && <span className="text-danger">-{m.cantidad}</span>}
                      {m.tipo_movimiento === 'Ajuste' && <span className="text-warning">={m.cantidad}</span>}
                    </td>
                    <td className="text-sm">{m.usuario?.nombre || 'Administrador'}</td>
                    <td className="text-sm text-muted">{m.observaciones || 'Sin detalles'}</td>
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
              {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} movimientos
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

      {/* Modal de Transacción Kardex */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Movimiento de Inventario</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Producto a Afectar *</label>
                <select
                  name="producto_id"
                  value={form.producto_id}
                  onChange={handleChange}
                  required
                >
                  {productos.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nombre} (Stock actual: {prod.stock} uds)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Movimiento *</label>
                  <select
                    name="tipo_movimiento"
                    value={form.tipo_movimiento}
                    onChange={handleChange}
                    required
                  >
                    <option value="Entrada">📥 Entrada (+ Suma al stock)</option>
                    <option value="Salida">📤 Salida (- Resta del stock)</option>
                    <option value="Ajuste">⚖️ Ajuste (= Establece stock)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cantidad de Unidades *</label>
                  <input
                    type="number"
                    name="cantidad"
                    min="1"
                    value={form.cantidad}
                    onChange={handleChange}
                    required
                    placeholder="Ej. 10"
                  />
                </div>
              </div>

              {/* Proyección del Stock con advertencia */}
              {selectedProduct && (
                <div className={`stock-preview-box ${projectedStock < 0 ? 'preview-danger' : ''}`}>
                  <div className="preview-label">Impacto de la transacción en el Stock:</div>
                  <div className="preview-values">
                    <span>Stock actual: <strong>{selectedProduct.stock}</strong></span>
                    <span>➜</span>
                    <span>
                      Stock resultante:{' '}
                      <strong className={projectedStock < 0 ? 'text-danger' : 'text-success'}>
                        {projectedStock !== null ? projectedStock : selectedProduct.stock} uds
                      </strong>
                    </span>
                  </div>
                  {projectedStock < 0 && (
                    <div className="preview-alert">
                      ⚠️ ¡Error! No se puede retirar más stock del disponible en almacén.
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Usuario Responsable *</label>
                <select
                  name="usuario_id"
                  value={form.usuario_id}
                  onChange={handleChange}
                  required
                >
                  {usuarios.map((usu) => (
                    <option key={usu.id} value={usu.id}>
                      {usu.nombre} ({usu.rol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Observaciones / Motivo</label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Ej. Reabastecimiento según factura F001-239..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={projectedStock < 0}
                >
                  Confirmar Transacción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kardex;
