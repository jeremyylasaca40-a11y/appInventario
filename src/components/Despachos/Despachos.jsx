import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import html2pdf from 'html2pdf.js';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import './Despachos.css';

const Despachos = () => {
  // Pestaña activa: 'nuevo' (Carrito) | 'historial' (Guías Emitidas)
  const [activeTab, setActiveTab] = useState('nuevo');

  // Catálogo de productos
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('');
  
  // Carrito de Despacho
  const [cart, setCart] = useState([]);
  
  // Datos del formulario de la nueva Guía
  const [guiaData, setGuiaData] = useState({
    guia_numero: `GD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    destinatario: '',
    observaciones: ''
  });

  // Historial de Guías
  const [guias, setGuias] = useState([]);
  const [loadingGuias, setLoadingGuias] = useState(false);
  const [searchGuia, setSearchGuia] = useState('');

  // Modal de Comprobante / Guía Oficial (para nueva emisión o reimpresión)
  const [guiaEmitida, setGuiaEmitida] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    cargarDatos();
    fetchGuias();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resProd, resCat] = await Promise.all([
        api.get('/api/productos'),
        api.get('/api/categorias')
      ]);
      setProductos(resProd.data);
      setCategorias(resCat.data);
    } catch {
      showToast('Error al cargar catálogo de productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuias = async () => {
    try {
      setLoadingGuias(true);
      const res = await api.get('/api/movimientos/guias');
      setGuias(res.data);
    } catch {
      // Ignorar si no hay sesión iniciada
    } finally {
      setLoadingGuias(false);
    }
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('guia-imprimible');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `Guia_${guiaEmitida?.guia_numero || 'Despacho'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // --- LÓGICA DEL CARRITO ---
  const addToCart = (prod) => {
    if (prod.stock <= 0) {
      showToast(`"${prod.nombre}" no tiene unidades en stock`, 'error');
      return;
    }

    const existing = cart.find((item) => item.producto.id === prod.id);
    if (existing) {
      if (existing.cantidad >= prod.stock) {
        showToast(`Has alcanzado el límite de stock disponible (${prod.stock} uds)`, 'error');
        return;
      }
      setCart(cart.map((item) =>
        item.producto.id === prod.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCart([...cart, { producto: prod, cantidad: 1 }]);
    }
    showToast(`Agregado al despacho: ${prod.nombre}`, 'info');
  };

  const updateQuantity = (prodId, delta) => {
    const item = cart.find((it) => it.producto.id === prodId);
    if (!item) return;

    const nuevaCant = item.cantidad + delta;
    if (nuevaCant <= 0) {
      removeFromCart(prodId);
      return;
    }
    if (nuevaCant > item.producto.stock) {
      showToast(`Stock máximo disponible: ${item.producto.stock} uds`, 'error');
      return;
    }

    setCart(cart.map((it) =>
      it.producto.id === prodId ? { ...it, cantidad: nuevaCant } : it
    ));
  };

  const removeFromCart = (prodId) => {
    setCart(cart.filter((it) => it.producto.id !== prodId));
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('¿Deseas vaciar la orden de despacho actual?')) {
      setCart([]);
    }
  };

  // Cálculos del Carrito
  const totalArticulos = cart.reduce((acc, it) => acc + it.cantidad, 0);
  const totalValor = cart.reduce(
    (acc, it) => acc + parseFloat(it.producto.precio) * it.cantidad,
    0
  );

  // --- CONFIRMAR DESPACHO ---
  const handleSubmitDespacho = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('El carrito de despacho está vacío', 'error');
      return;
    }
    if (!guiaData.destinatario.trim()) {
      showToast('Por favor indica el destinatario o área receptora', 'error');
      return;
    }

    let currentUserId = 1;
    let currentUserName = 'Usuario SENATI';
    try {
      const stored = localStorage.getItem('senati_user');
      if (stored) {
        const u = JSON.parse(stored);
        currentUserId = u.id || 1;
        currentUserName = u.nombre || 'Usuario SENATI';
      }
    } catch (e) {
      console.error(e);
    }

    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((it) => ({
          producto_id: it.producto.id,
          cantidad: it.cantidad
        })),
        usuario_id: currentUserId,
        destinatario: guiaData.destinatario.trim(),
        guia_numero: guiaData.guia_numero.trim(),
        observaciones: guiaData.observaciones.trim()
      };

      const res = await api.post('/api/movimientos/despacho-multiple', payload);

      // Guardar comprobante para modal
      setGuiaEmitida({
        ...res.data,
        despachador: currentUserName
      });

      // Limpiar y refrescar
      setCart([]);
      setGuiaData({
        guia_numero: `GD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        destinatario: '',
        observaciones: ''
      });
      cargarDatos();
      fetchGuias();
      showToast('✅ ¡Despacho emitido con éxito! Stock descontado');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al emitir despacho', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado de productos catálogo
  const filteredProds = productos.filter((p) => {
    const matchesSearch =
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = catFilter ? String(p.categoria_id) === catFilter : true;
    return matchesSearch && matchesCat;
  });

  // Filtrado de historial de guías
  const filteredGuias = guias.filter((g) => {
    const term = searchGuia.toLowerCase();
    return (
      g.guia_numero?.toLowerCase().includes(term) ||
      g.destinatario?.toLowerCase().includes(term) ||
      g.despachador?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="view-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header y Navegación de Pestañas */}
      <div className="despacho-page-header">
        <div className="despacho-header-title">
          <h2>🚚 Módulo de Despachos y Salidas Múltiples</h2>
          <p>Prepara órdenes de entrega corporativa y consulta el historial de guías emitidas.</p>
        </div>

        {/* Pestañas */}
        <div className="despacho-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'nuevo' ? 'active' : ''}`}
            onClick={() => setActiveTab('nuevo')}
          >
            🛒 Nueva Orden de Despacho
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
            onClick={() => { setActiveTab('historial'); fetchGuias(); }}
          >
            📋 Historial de Guías ({guias.length})
          </button>
        </div>
      </div>

      {/* VISTA 1: NUEVA ORDEN DE DESPACHO (CARRITO) */}
      {activeTab === 'nuevo' && (
        <div className="despacho-grid">
          {/* PANEL IZQUIERDO: CATÁLOGO DE PRODUCTOS DISPONIBLES */}
          <div className="despacho-catalog-card">
            <div className="catalog-header">
              <h3>📦 Catálogo Disponible en Almacén</h3>
              <span className="count-badge">{filteredProds.length} disponibles</span>
            </div>

            {/* Filtros */}
            <div className="catalog-filters">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="cat-select"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Grid de productos */}
            <div className="catalog-items-scroll">
              {loading ? (
                <div className="catalog-loading">⏳ Cargando productos...</div>
              ) : filteredProds.length === 0 ? (
                <div className="catalog-empty">No se encontraron productos coincidentes</div>
              ) : (
                <div className="prods-mini-grid">
                  {filteredProds.map((p) => {
                    const inCartItem = cart.find((it) => it.producto.id === p.id);
                    const isAgotado = p.stock <= 0;
                    return (
                      <div key={p.id} className={`prod-mini-card ${isAgotado ? 'agotado' : ''}`}>
                        <div className="prod-mini-info">
                          <strong>{p.nombre}</strong>
                          <div className="prod-mini-meta">
                            <span className="cat-pill">🏷️ {p.categoria?.nombre || 'General'}</span>
                            <span className="price-tag">S/ {parseFloat(p.precio).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="prod-mini-bottom">
                          <span className={`stock-pill ${p.stock <= (p.stock_minimo || 5) ? 'low' : 'ok'}`}>
                            Stock: {p.stock} uds
                          </span>
                          <button
                            type="button"
                            className="btn-add-cart"
                            disabled={isAgotado}
                            onClick={() => addToCart(p)}
                          >
                            {inCartItem ? `+1 (Llevas ${inCartItem.cantidad})` : '＋ Agregar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PANEL DERECHO: ORDEN DE DESPACHO (CARRITO) */}
          <div className="despacho-cart-card">
            <div className="cart-header">
              <div className="cart-header-title">
                <h3>📋 Orden de Salida</h3>
                <span className="cart-items-pill">{totalArticulos} unidades en orden</span>
              </div>
              {cart.length > 0 && (
                <button type="button" className="btn-clear-cart" onClick={clearCart}>
                  🗑️ Vaciar
                </button>
              )}
            </div>

            {/* Lista de productos en orden */}
            <div className="cart-items-list">
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <span className="empty-cart-icon">🛒</span>
                  <h4>El carrito de salida está vacío</h4>
                  <p>Selecciona productos del catálogo izquierdo para agregarlos al despacho.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.producto.id} className="cart-item-row">
                    <div className="cart-item-info">
                      <strong>{item.producto.nombre}</strong>
                      <span>S/ {parseFloat(item.producto.precio).toFixed(2)} c/u</span>
                    </div>

                    <div className="cart-item-actions">
                      <div className="qty-control">
                        <button type="button" onClick={() => updateQuantity(item.producto.id, -1)}>−</button>
                        <span>{item.cantidad}</span>
                        <button type="button" onClick={() => updateQuantity(item.producto.id, 1)}>+</button>
                      </div>
                      <span className="cart-item-subtotal">
                        S/ {(parseFloat(item.producto.precio) * item.cantidad).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        className="btn-remove-item"
                        onClick={() => removeFromCart(item.producto.id)}
                        title="Quitar"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulario y Resumen */}
            <form onSubmit={handleSubmitDespacho} className="cart-checkout-area">
              <div className="checkout-inputs">
                <div className="input-group-row">
                  <div className="form-group">
                    <label>N° de Guía de Salida *</label>
                    <input
                      type="text"
                      required
                      value={guiaData.guia_numero}
                      onChange={(e) => setGuiaData({ ...guiaData, guia_numero: e.target.value })}
                      placeholder="Ej. GD-2026-001"
                    />
                  </div>

                  <div className="form-group">
                    <label>Destinatario / Área Receptora *</label>
                    <input
                      type="text"
                      required
                      value={guiaData.destinatario}
                      onChange={(e) => setGuiaData({ ...guiaData, destinatario: e.target.value })}
                      placeholder="Ej. Laboratorio 102 / Cliente Mostrador"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Motivo u Observación</label>
                  <input
                    type="text"
                    value={guiaData.observaciones}
                    onChange={(e) => setGuiaData({ ...guiaData, observaciones: e.target.value })}
                    placeholder="Ej. Prácticas académicas o venta al contado"
                  />
                </div>
              </div>

              {/* Totales */}
              <div className="cart-summary-box">
                <div className="summary-line">
                  <span>Artículos distintos:</span>
                  <strong>{cart.length}</strong>
                </div>
                <div className="summary-line">
                  <span>Total unidades a descontar:</span>
                  <strong>{totalArticulos} uds</strong>
                </div>
                <div className="summary-line total-highlight">
                  <span>Valor Total de Salida:</span>
                  <span className="total-amount">S/ {totalValor.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn-emitir-despacho"
                disabled={cart.length === 0 || submitting}
              >
                {submitting ? '⏳ Procesando Despacho...' : '🚚 Confirmar y Emitir Despacho'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE GUÍAS DE DESPACHO EMITIDAS */}
      {activeTab === 'historial' && (
        <div className="table-card">
          <div className="table-card-title">
            <div className="table-title-left">
              <div className="table-title-icon">📋</div>
              <h3>Historial de Guías de Despacho Emitidas</h3>
            </div>
            <div className="search-box" style={{ width: '320px' }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar por N° de Guía o Destino..."
                value={searchGuia}
                onChange={(e) => setSearchGuia(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° de Guía</th>
                  <th>Fecha y Hora</th>
                  <th>Destinatario / Receptor</th>
                  <th>Despachador</th>
                  <th>Artículos</th>
                  <th style={{ textAlign: 'right' }}>Total Valorizado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingGuias ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">⏳ Cargando historial de guías...</td>
                  </tr>
                ) : filteredGuias.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No se encontraron guías emitidas coincidentes.
                    </td>
                  </tr>
                ) : (
                  filteredGuias.map((g) => (
                    <tr
                      key={g.guia_numero}
                      className="kardex-clickable-row"
                      onClick={() => setGuiaEmitida(g)}
                      title="Clic para ver o reimprimir esta guía"
                    >
                      <td>
                        <span className="guia-code-pill">{g.guia_numero}</span>
                      </td>
                      <td className="text-sm text-muted">
                        {new Date(g.fecha).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <strong>{g.destinatario}</strong>
                      </td>
                      <td className="text-sm">{g.despachador}</td>
                      <td>
                        <span className="guia-items-summary">
                          {g.items.length} prod ({g.total_items} uds)
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        S/ {parseFloat(g.total_valor).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-ver-boleta"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGuiaEmitida(g);
                          }}
                          title="Ver o reimprimir guía"
                        >
                          📄 Ver / Reimprimir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL / COMPROBANTE OFICIAL DE GUÍA DE SALIDA SENATI (CENTRADO) --- */}
      {guiaEmitida && createPortal(
        <div className="guia-modal-backdrop" onClick={() => setGuiaEmitida(null)}>
          <div className="guia-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="guia-printable-sheet" id="guia-imprimible">
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
                  <span className="guia-tipo-label">GUÍA DE SALIDA Y DESPACHO</span>
                  <strong className="guia-numero-display">{guiaEmitida.guia_numero}</strong>
                </div>
              </div>

              {/* Datos de la transacción */}
              <div className="guia-meta-grid">
                <div>
                  <span className="meta-label">Fecha y Hora de Emisión:</span>
                  <strong>{new Date(guiaEmitida.fecha).toLocaleString('es-PE')}</strong>
                </div>
                <div>
                  <span className="meta-label">Responsable / Despachador:</span>
                  <strong>{guiaEmitida.despachador}</strong>
                </div>
                <div>
                  <span className="meta-label">Destinatario / Receptor:</span>
                  <strong>{guiaEmitida.destinatario}</strong>
                </div>
                <div>
                  <span className="meta-label">Observaciones:</span>
                  <span>{guiaEmitida.observaciones || 'Despacho conforme'}</span>
                </div>
              </div>

              {/* Tabla de artículos */}
              <table className="guia-table">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Descripción del Producto</th>
                    <th style={{ textAlign: 'center' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>P. Unit (S/)</th>
                    <th style={{ textAlign: 'right' }}>Subtotal (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {guiaEmitida.items.map((it, idx) => (
                    <tr key={it.producto_id || idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{it.nombre}</strong></td>
                      <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                      <td style={{ textAlign: 'right' }}>{parseFloat(it.precio).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{it.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2" style={{ fontWeight: 'bold' }}>TOTAL DESPACHADO</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{guiaEmitida.total_items} uds</td>
                    <td></td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                      S/ {parseFloat(guiaEmitida.total_valor).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Bloque de firmas */}
              <div className="guia-firmas-row">
                <div className="firma-box">
                  <div className="firma-line"></div>
                  <span>Entregado conforme (Almacén)</span>
                  <small>{guiaEmitida.despachador}</small>
                </div>
                <div className="firma-box">
                  <div className="firma-line"></div>
                  <span>Recibido conforme</span>
                  <small>{guiaEmitida.destinatario}</small>
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
                onClick={handleDownloadPdf}
              >
                📥 Descargar PDF
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setGuiaEmitida(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Despachos;
