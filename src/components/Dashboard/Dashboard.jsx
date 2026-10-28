import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Toast from '../Toast/Toast';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import './Dashboard.css';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [data, setData] = useState({
    kpis: {
      totalProductos: 0,
      totalCategorias: 0,
      totalProveedores: 0,
      bajoStockCount: 0,
      valorTotalInventario: 0,
      tasaSalud: 100
    },
    productosBajoStock: [],
    movimientosRecientes: [],
    stockPorCategoria: [],
    tendenciaKardex: [],
    productosLista: []
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modal de Acción Rápida (Entrada o Salida)
  const [quickModal, setQuickModal] = useState({
    open: false,
    tipo: 'Entrada', // 'Entrada' | 'Salida'
    producto_id: '',
    cantidad: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/dashboard/stats');
      setData(res.data);
      if (res.data.productosLista && res.data.productosLista.length > 0) {
        setQuickModal((prev) => ({
          ...prev,
          producto_id: res.data.productosLista[0].id
        }));
      }
    } catch (err) {
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- EXPORTAR A CSV (Excel) ---
  const handleExportCSV = () => {
    if (!data.productosLista || data.productosLista.length === 0) {
      showToast('No hay datos disponibles para exportar', 'warning');
      return;
    }
    const headers = ['ID,Nombre,Categoria,Precio_Soles,Stock_Actual,Stock_Minimo,Valor_Total'];
    const rows = data.productosLista.map((p) => {
      const valor = (parseFloat(p.precio) * parseInt(p.stock, 10)).toFixed(2);
      return `"${p.id}","${p.nombre.replace(/"/g, '""')}","${p.categoria?.nombre || 'General'}","${p.precio}","${p.stock}","${p.stock_minimo || 5}","${valor}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventario_SENATI_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte de inventario descargado con éxito', 'success');
  };

  // --- SUBMIT DE ACCIÓN RÁPIDA DE KARDEX ---
  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    let currentUserId = 1;
    try {
      const stored = localStorage.getItem('senati_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id) currentUserId = u.id;
      }
    } catch (err) {
      console.error(err);
    }

    try {
      await api.post('/api/movimientos', {
        producto_id: quickModal.producto_id,
        usuario_id: currentUserId,
        tipo_movimiento: quickModal.tipo,
        cantidad: quickModal.cantidad,
        observaciones: quickModal.observaciones || `Acción rápida desde el Dashboard (${quickModal.tipo})`
      });
      showToast(`¡${quickModal.tipo} registrada con éxito! Stock actualizado`);
      setQuickModal({ ...quickModal, open: false, cantidad: '', observaciones: '' });
      fetchDashboardStats();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al procesar movimiento', 'error');
    }
  };

  // --- CONFIGURACIÓN DE GRÁFICOS CHART.JS ---
  const chartColors = ['#004b93', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  // 1. Donut Chart Data (Stock por Categoría)
  const donutData = {
    labels: data.stockPorCategoria.map((c) => c.categoria),
    datasets: [
      {
        data: data.stockPorCategoria.map((c) => c.totalStock),
        backgroundColor: chartColors.slice(0, data.stockPorCategoria.length),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 14,
          font: { size: 12, family: 'sans-serif', weight: 'bold' },
          color: '#334155'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return ` ${val} unidades (${pct}%)`;
          }
        }
      }
    },
    cutout: '68%'
  };

  // 2. Bar Chart Data (Tendencia Entradas vs Salidas)
  const barLabels = data.tendenciaKardex.length > 0
    ? data.tendenciaKardex.map((t) => t.fecha)
    : ['Hoy'];
  const barData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Entradas (📥)',
        data: data.tendenciaKardex.map((t) => t.entradas),
        backgroundColor: '#10b981',
        borderRadius: 6
      },
      {
        label: 'Salidas (📤)',
        data: data.tendenciaKardex.map((t) => t.salidas),
        backgroundColor: '#ef4444',
        borderRadius: 6
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          font: { size: 12, weight: 'bold' },
          color: '#334155'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 5, color: '#64748b' },
        grid: { color: '#f1f5f9' }
      },
      x: {
        ticks: { color: '#64748b' },
        grid: { display: false }
      }
    }
  };

  const totalStockSum = data.stockPorCategoria.reduce((acc, c) => acc + (c.totalStock || 0), 0);

  return (
    <div className="dashboard-view">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Barra de Acciones Rápidas (Quick Actions Bar) */}
      <div className="dashboard-action-bar">
        <div className="action-bar-text">
          <h2>Resumen Ejecutivo de Inventario</h2>
          <p>Métricas en tiempo real, valoración económica y auditoría Kardex</p>
        </div>

        <div className="action-buttons-group">
          <button
            className="btn-quick btn-quick-entrada"
            onClick={() => setQuickModal({ open: true, tipo: 'Entrada', producto_id: data.productosLista[0]?.id || '', cantidad: '', observaciones: '' })}
          >
            <span>📥</span> + Entrada Rápida
          </button>
          <button
            className="btn-quick btn-quick-salida"
            onClick={() => setQuickModal({ open: true, tipo: 'Salida', producto_id: data.productosLista[0]?.id || '', cantidad: '', observaciones: '' })}
          >
            <span>📤</span> + Salida Rápida
          </button>
          <button className="btn-quick btn-quick-export" onClick={handleExportCSV}>
            <span>📊</span> Exportar a Excel
          </button>
        </div>
      </div>

      {/* 5 Tarjetas KPI con Métricas Financieras y Salud */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-card-financial">
          <div className="kpi-info">
            <span className="kpi-label">Valorización de Almacén</span>
            <span className="kpi-value text-financial">
              {loading ? '...' : `S/ ${parseFloat(data.kpis.valorTotalInventario || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            <span className="kpi-subtitle">Capital total en inventario</span>
          </div>
          <div className="kpi-icon-box bg-emerald">💰</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Total Productos</span>
            <span className="kpi-value">{loading ? '...' : data.kpis.totalProductos}</span>
            <span className="kpi-subtitle">Artículos activos</span>
          </div>
          <div className="kpi-icon-box bg-blue">📦</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Categorías</span>
            <span className="kpi-value">{loading ? '...' : data.kpis.totalCategorias}</span>
            <span className="kpi-subtitle">Familias de producto</span>
          </div>
          <div className="kpi-icon-box bg-indigo">🏷️</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Proveedores</span>
            <span className="kpi-value">{loading ? '...' : data.kpis.totalProveedores}</span>
            <span className="kpi-subtitle">Socios comerciales</span>
          </div>
          <div className="kpi-icon-box bg-purple">🚚</div>
        </div>

        <div className={`kpi-card ${data.kpis.bajoStockCount > 0 ? 'kpi-card-alert' : ''}`}>
          <div className="kpi-info">
            <span className="kpi-label">Alertas de Stock</span>
            <span className="kpi-value text-danger">{loading ? '...' : data.kpis.bajoStockCount}</span>
            <span className="kpi-subtitle">Salud: {data.kpis.tasaSalud}% óptimo</span>
          </div>
          <div className="kpi-icon-box bg-amber">⚠️</div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS PROFESIONALES */}
      <div className="charts-grid">
        {/* Gráfico 1: Dona Interactiva (Stock por Categoría) */}
        <div className="dash-card chart-card">
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">Stock por Categoría (Gráfico Donut)</h3>
              <p className="dash-card-subtitle">Distribución porcentual de {totalStockSum} unidades</p>
            </div>
            <span className="badge-chart-info">Tiempo Real</span>
          </div>

          <div className="donut-chart-wrapper">
            {data.stockPorCategoria.length > 0 ? (
              <Doughnut data={donutData} options={donutOptions} />
            ) : (
              <div className="text-center py-5 text-muted">Cargando gráfico...</div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Barras de Flujo (Entradas vs Salidas) */}
        <div className="dash-card chart-card">
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">Flujo de Kardex (Entradas vs Salidas)</h3>
              <p className="dash-card-subtitle">Movimiento de unidades por transacción</p>
            </div>
            <button className="btn-refresh" onClick={fetchDashboardStats} title="Recargar">
              🔄
            </button>
          </div>

          <div className="bar-chart-wrapper">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: Movimientos Recientes + Alertas de Reposición */}
      <div className="dashboard-grid">
        {/* Tabla Kardex Reciente */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">Movimientos Recientes de Kardex</h3>
              <p className="dash-card-subtitle">Auditoría de operaciones con usuario responsable</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {data.movimientosRecientes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No hay movimientos recientes
                    </td>
                  </tr>
                ) : (
                  data.movimientosRecientes.map((m) => (
                    <tr key={m.id}>
                      <td className="text-muted text-sm">
                        {new Date(m.fecha_hora).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="font-semibold">{m.producto?.nombre || 'Producto'}</td>
                      <td>
                        <span className={`badge-pill badge-${m.tipo_movimiento.toLowerCase()}`}>
                          {m.tipo_movimiento}
                        </span>
                      </td>
                      <td className="font-bold">
                        {m.tipo_movimiento === 'Entrada' && (
                          <span className="text-success">+{m.cantidad}</span>
                        )}
                        {m.tipo_movimiento === 'Salida' && (
                          <span className="text-danger">-{m.cantidad}</span>
                        )}
                        {m.tipo_movimiento === 'Ajuste' && (
                          <span className="text-warning">={m.cantidad}</span>
                        )}
                      </td>
                      <td className="text-sm text-muted">{m.usuario?.nombre || 'Admin'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas de Bajo Stock con Botón de Reposición Directo */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">⚠️ Reposición Crítica de Stock</h3>
              <p className="dash-card-subtitle">Artículos que requieren abastecimiento inmediato</p>
            </div>
          </div>

          {data.productosBajoStock.length === 0 ? (
            <div className="all-good-box">
              <span className="all-good-icon">✅</span>
              <h4>¡Inventario en Nivel Óptimo!</h4>
              <p>Todos los productos superan el stock mínimo configurado.</p>
            </div>
          ) : (
            <div className="low-stock-list-enhanced">
              {data.productosBajoStock.map((prod) => (
                <div key={prod.id} className="low-stock-item-row">
                  <div className="item-details">
                    <span className="item-name">{prod.nombre}</span>
                    <span className="item-meta">
                      Categoría: {prod.categoria?.nombre || 'General'} • Mínimo: {prod.stock_minimo || 5} uds
                    </span>
                  </div>
                  <div className="item-action-area">
                    <span className="stock-critical-pill">Stock: {prod.stock}</span>
                    <button
                      className="btn-reponer-quick"
                      onClick={() => setQuickModal({
                        open: true,
                        tipo: 'Entrada',
                        producto_id: prod.id,
                        cantidad: '10',
                        observaciones: `Reabastecimiento urgente de stock crítico`
                      })}
                    >
                      + Reponer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE ACCIÓN RÁPIDA (Entrada / Salida Directa) */}
      {quickModal.open && (
        <div className="modal-backdrop" onClick={() => setQuickModal({ ...quickModal, open: false })}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {quickModal.tipo === 'Entrada' ? '📥 Registrar Entrada Rápida' : '📤 Registrar Salida Rápida'}
              </h3>
              <button className="modal-close-btn" onClick={() => setQuickModal({ ...quickModal, open: false })}>
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="modal-form">
              <div className="form-group">
                <label>Seleccionar Producto *</label>
                <select
                  value={quickModal.producto_id}
                  onChange={(e) => setQuickModal({ ...quickModal, producto_id: e.target.value })}
                  required
                >
                  {data.productosLista.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stock} uds)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Cantidad a {quickModal.tipo === 'Entrada' ? 'Ingresar (+)' : 'Retirar (-)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quickModal.cantidad}
                  onChange={(e) => setQuickModal({ ...quickModal, cantidad: e.target.value })}
                  placeholder="Ej. 10"
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo u Observación</label>
                <input
                  type="text"
                  value={quickModal.observaciones}
                  onChange={(e) => setQuickModal({ ...quickModal, observaciones: e.target.value })}
                  placeholder="Ej. Entrada directa por reposición..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setQuickModal({ ...quickModal, open: false })}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Confirmar {quickModal.tipo}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
