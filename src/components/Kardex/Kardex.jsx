import html2pdf from 'html2pdf.js';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [comprobanteMov, setComprobanteMov] = useState(null);

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

  
  const handleDownloadKardexPdf = (mov) => {
    const element = document.getElementById('comprobante-kardex-sheet');
    if (!element) return;
    const numDoc = mov?.observaciones?.match(/\[Guía:\s*([^\]]+)\]/i)?.[1] || `MOV-00${mov?.id}`;
    const opt = {
      margin: 10,
      filename: `Comprobante_${numDoc}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
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
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">Cargando Kardex...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No se encontraron movimientos.</td>
                </tr>
              ) : (
                currentItems.map((m) => (
                  <tr key={m.id} className="kardex-clickable-row" onClick={() => setComprobanteMov(m)} title="Clic para ver detalle y boleta oficial">
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
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-ver-boleta"
                        onClick={(e) => {
                          e.stopPropagation();
                          setComprobanteMov(m);
                        }}
                        title="Ver detalle completo y boleta oficial"
                      >
                        👁️ Ver Detalle
                      </button>
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


      {/* --- MODAL / BOLETA OFICIAL DE MOVIMIENTO KARDEX --- */}
      {comprobanteMov && createPortal(
        <div className="guia-modal-backdrop" onClick={() => setComprobanteMov(null)}>
          <div className="guia-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="guia-printable-sheet" id="comprobante-kardex-sheet">
              {/* Header SENATI */}
              <div className="guia-header">
                <div className="guia-logo-area">
                  <div className="guia-senati-badge">SENATI</div>
                  <div className="guia-system-text">
                    <strong>Sistema de Control de Inventario</strong>
                    <span>Centro de Formación Profesional 2026</span>
                  </div>
                </div>
                <div className="guia-badge-box">
                  <span className="guia-tipo-label">
                    {comprobanteMov.tipo_movimiento === 'Salida'
                      ? 'GUÍA DE SALIDA Y DESPACHO'
                      : comprobanteMov.tipo_movimiento === 'Entrada'
                      ? 'COMPROBANTE DE INGRESO Y REPOSICIÓN'
                      : 'ACTA DE AJUSTE DE INVENTARIO'}
                  </span>
                  <strong className="guia-numero-display">
                    {comprobanteMov.observaciones?.match(/\[Guía:\s*([^\]]+)\]/i)?.[1] ||
                      `MOV-${comprobanteMov.tipo_movimiento.toUpperCase().slice(0, 3)}-${String(comprobanteMov.id).padStart(4, '0')}`}
                  </strong>
                </div>
              </div>

              {/* Metadatos */}
              <div className="guia-meta-grid">
                <div>
                  <span className="meta-label">Fecha y Hora de Registro:</span>
                  <strong>{new Date(comprobanteMov.fecha_hora).toLocaleString('es-PE')}</strong>
                </div>
                <div>
                  <span className="meta-label">Usuario Responsable:</span>
                  <strong>{comprobanteMov.usuario?.nombre || 'Usuario SENATI'}</strong>
                </div>
                <div>
                  <span className="meta-label">Tipo de Transacción:</span>
                  <span className={`badge-pill badge-${comprobanteMov.tipo_movimiento.toLowerCase()}`}>
                    {comprobanteMov.tipo_movimiento} Oficial
                  </span>
                </div>
                <div>
                  <span className="meta-label">Detalles / Observaciones:</span>
                  <span>{comprobanteMov.observaciones || 'Sin observaciones registradas'}</span>
                </div>
              </div>

              {/* Tabla del movimiento */}
              <table className="guia-table">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Producto Afectado</th>
                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>P. Referencial (S/)</th>
                    <th style={{ textAlign: 'right' }}>Valor Total (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td><strong>{comprobanteMov.producto?.nombre || 'Producto'}</strong></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {comprobanteMov.tipo_movimiento === 'Salida' ? `-${comprobanteMov.cantidad}` : `+${comprobanteMov.cantidad}`} uds
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {parseFloat(comprobanteMov.producto?.precio || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {(parseFloat(comprobanteMov.producto?.precio || 0) * comprobanteMov.cantidad).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2" style={{ fontWeight: 'bold' }}>TOTAL VALORIZADO</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{comprobanteMov.cantidad} uds</td>
                    <td></td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                      S/ {(parseFloat(comprobanteMov.producto?.precio || 0) * comprobanteMov.cantidad).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Firmas de conformidad */}
              <div className="guia-firmas-row">
                <div className="firma-box">
                  <div className="firma-line"></div>
                  <span>Emitido / Autorizado</span>
                  <small>{comprobanteMov.usuario?.nombre || 'Responsable de Almacén'}</small>
                </div>
                <div className="firma-box">
                  <div className="firma-line"></div>
                  <span>Recepción / Auditoría</span>
                  <small>SENATI Control de Inventario</small>
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="guia-modal-actions">
              <button
                type="button"
                className="btn-print-guia"
                onClick={() => window.print()}
              >
                🖨️ Imprimir
              </button>
              <button
                type="button"
                className="btn-pdf-guia"
                onClick={() => handleDownloadKardexPdf(comprobanteMov)}
              >
                📥 Descargar PDF
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setComprobanteMov(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Transacción Kardex */}
      {showModal && createPortal(
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  🔄
                </div>
                <div className="modal-header-text">
                  <h3>Registrar Movimiento de Inventario</h3>
                  <p>Operación transaccional con actualización de stock</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)} aria-label="Cerrar">×</button>
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default Kardex;
