import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import './Productos.css';

/* Emoji avatar según primera letra */
const getProductEmoji = (nombre = '') => {
  const map = {
    'L': '💻', 'M': '🖥️', 'T': '⌨️', 'I': '🖨️', 'C': '📷',
    'A': '🔌', 'R': '📡', 'S': '📱', 'D': '💾', 'P': '🖱️',
    'G': '🎮', 'E': '🔋', 'B': '📦', 'U': '🔧',
  };
  const letter = (nombre[0] || 'P').toUpperCase();
  return map[letter] || '📦';
};

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Estado del Formulario Relacional
  const [form, setForm] = useState({
    id: null,
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    stock_minimo: 5,
    categoria_id: '',
    proveedor_id: ''
  });

  useEffect(() => { cargarDatos(); }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resProd, resCat, resProv] = await Promise.all([
        api.get('/api/productos'),
        api.get('/api/categorias'),
        api.get('/api/proveedores')
      ]);
      setProductos(resProd.data);
      setCategorias(resCat.data);
      setProveedores(resProv.data);
    } catch {
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleOpenModal = (prod = null) => {
    if (prod) {
      setForm({
        id: prod.id,
        nombre: prod.nombre,
        descripcion: prod.descripcion || '',
        precio: prod.precio,
        stock: prod.stock,
        stock_minimo: prod.stock_minimo || 5,
        categoria_id: prod.categoria_id || '',
        proveedor_id: prod.proveedor_id || ''
      });
    } else {
      setForm({
        id: null, nombre: '', descripcion: '', precio: '', stock: '',
        stock_minimo: 5,
        categoria_id: categorias[0]?.id || '',
        proveedor_id: proveedores[0]?.id || ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/api/productos/${form.id}`, form);
        showToast('✅ Producto actualizado correctamente');
      } else {
        await api.post('/api/productos', form);
        showToast('✅ Producto creado y vinculado exitosamente');
      }
      setShowModal(false);
      cargarDatos();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar producto', 'error');
    }
  };

  const handleDelete = async (id, nombre) => {
    if (window.confirm(`¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        await api.delete(`/api/productos/${id}`);
        showToast('🗑️ Producto eliminado exitosamente', 'info');
        cargarDatos();
      } catch {
        showToast('Error al eliminar producto', 'error');
      }
    }
  };

  // Filtrado
  const filtered = productos.filter((p) => {
    const term = searchTerm.toLowerCase();
    return p.nombre?.toLowerCase().includes(term) || p.categoria?.nombre?.toLowerCase().includes(term);
  });

  // Stats
  const totalStock = productos.reduce((s, p) => s + Number(p.stock || 0), 0);
  const lowStockCount = productos.filter(p => p.stock <= (p.stock_minimo || 5)).length;
  const totalValor = productos.reduce((s, p) => s + Number(p.precio || 0) * Number(p.stock || 0), 0);

  // Paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="view-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── STAT CARDS ── */}
      <div className="prod-stats-row">
        <div className="prod-stat-card stat-blue">
          <div className="prod-stat-icon">📦</div>
          <div className="prod-stat-info">
            <strong>{productos.length}</strong>
            <span>Total Productos</span>
          </div>
        </div>
        <div className="prod-stat-card stat-green">
          <div className="prod-stat-icon">📊</div>
          <div className="prod-stat-info">
            <strong>{totalStock.toLocaleString()}</strong>
            <span>Unidades en Stock</span>
          </div>
        </div>
        <div className="prod-stat-card stat-red">
          <div className="prod-stat-icon">⚠️</div>
          <div className="prod-stat-info">
            <strong>{lowStockCount}</strong>
            <span>Stock Crítico</span>
          </div>
        </div>
        <div className="prod-stat-card stat-amber">
          <div className="prod-stat-icon">💰</div>
          <div className="prod-stat-info">
            <strong>S/ {totalValor.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</strong>
            <span>Valor Inventario</span>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="view-header">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="search-productos"
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button id="btn-nuevo-producto" className="btn-primary" onClick={() => handleOpenModal()}>
          <span>＋</span> Nuevo Producto
        </button>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="table-card">
        <div className="table-card-title">
          <div className="table-title-left">
            <div className="table-title-icon">📋</div>
            <h3>Catálogo de Productos</h3>
          </div>
          <span className="count-badge">{filtered.length} registros</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan="6">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>⏳</span>
                      <span className="loading-dots">Cargando catálogo</span>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="table-empty-state">
                      <div className="empty-icon">🔍</div>
                      <p className="empty-title">No se encontraron productos</p>
                      <p className="empty-desc">Intenta con otro término de búsqueda o agrega un nuevo producto.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((p) => {
                  const isLow = p.stock <= (p.stock_minimo || 5);
                  return (
                    <tr key={p.id}>
                      {/* ID */}
                      <td>
                        <span className="row-id">{String(p.id).padStart(3, '0')}</span>
                      </td>

                      {/* Producto + proveedor */}
                      <td>
                        <div className="prod-name-cell">
                          <div className="prod-avatar">{getProductEmoji(p.nombre)}</div>
                          <div className="prod-name-info">
                            <strong>{p.nombre}</strong>
                            {p.proveedor && (
                              <span className="prod-supplier">
                                🏭 {p.proveedor.razon_social}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td>
                        <span className="category-tag">
                          🏷️ {p.categoria?.nombre || 'Sin Categoría'}
                        </span>
                      </td>

                      {/* Precio */}
                      <td>
                        <span className="price-cell">
                          <span className="price-currency">S/</span>
                          {parseFloat(p.precio).toFixed(2)}
                        </span>
                      </td>

                      {/* Stock */}
                      <td>
                        <span className={`stock-badge ${isLow ? 'stock-low' : 'stock-ok'}`}>
                          <span className="stock-dot" />
                          {p.stock} uds{isLow && ' ⚠️'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons">
                          <button
                            id={`btn-edit-${p.id}`}
                            className="btn-action btn-edit"
                            onClick={() => handleOpenModal(p)}
                            title="Editar producto"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            id={`btn-delete-${p.id}`}
                            className="btn-action btn-delete"
                            onClick={() => handleDelete(p.id, p.nombre)}
                            title="Eliminar producto"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} productos
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

      {/* ── MODAL: Nuevo / Editar Producto ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  {form.id ? '✏️' : '📦'}
                </div>
                <div className="modal-header-text">
                  <h3>{form.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                  <p>{form.id ? `Modificando: ${form.nombre}` : 'Completa los campos para agregar al catálogo'}</p>
                </div>
              </div>
              <button
                id="btn-modal-close"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="modal-form" id="form-producto">
              {/* Información del producto */}
              <span className="form-section-label">📋 Información del Producto</span>

              <div className="form-group">
                <label htmlFor="f-nombre">
                  Nombre del Producto <span className="form-required">*</span>
                </label>
                <input
                  id="f-nombre"
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Teclado Mecánico Redragon K552"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="f-descripcion">Descripción</label>
                <textarea
                  id="f-descripcion"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Detalles técnicos, modelo o especificaciones..."
                />
              </div>

              {/* Precio y Stock */}
              <span className="form-section-label">💰 Precio y Stock</span>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="f-precio">
                    Precio (S/) <span className="form-required">*</span>
                  </label>
                  <input
                    id="f-precio"
                    type="number"
                    step="0.01"
                    min="0"
                    name="precio"
                    value={form.precio}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="f-stock">
                    Stock Inicial <span className="form-required">*</span>
                  </label>
                  <input
                    id="f-stock"
                    type="number"
                    min="0"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    required
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Relaciones 1:N */}
              <span className="form-section-label">🔗 Relaciones del Catálogo</span>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="f-categoria">
                    Categoría <span className="form-required">*</span>{' '}
                    <span className="relation-badge">1:N</span>
                  </label>
                  <select
                    id="f-categoria"
                    name="categoria_id"
                    value={form.categoria_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">— Seleccionar Categoría —</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="f-proveedor">
                    Proveedor <span className="relation-badge">1:N</span>
                  </label>
                  <select
                    id="f-proveedor"
                    name="proveedor_id"
                    value={form.proveedor_id}
                    onChange={handleChange}
                  >
                    <option value="">— Seleccionar Proveedor —</option>
                    {proveedores.map((prov) => (
                      <option key={prov.id} value={prov.id}>{prov.razon_social}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>

            {/* Modal Actions (fuera del form para posicionamiento) */}
            <div className="modal-actions">
              <button
                id="btn-modal-cancel"
                type="button"
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                id="btn-modal-submit"
                type="submit"
                form="form-producto"
                className="btn-primary"
              >
                {form.id ? '💾 Guardar Cambios' : '✅ Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Productos;
