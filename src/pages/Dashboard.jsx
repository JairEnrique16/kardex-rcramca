import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Dashboard() {
  const [totalProductos, setTotalProductos] = useState(0)
  const [stockBajo, setStockBajo] = useState([])
  const [movimientosHoy, setMovimientosHoy] = useState(0)
  const [ultimosMovimientos, setUltimosMovimientos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)

    // Total productos activos
    const { count: totalProd } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
    setTotalProductos(totalProd || 0)

    // Stock bajo
    const { data: productos } = await supabase
      .from('productos')
      .select('id_producto, nombre, stock_minimo')
      .eq('activo', true)

    const { data: stockData } = await supabase
      .from('stock')
      .select('id_producto, cantidad_actual')

    const stockPorProducto = {}
    stockData?.forEach(s => {
      stockPorProducto[s.id_producto] = (stockPorProducto[s.id_producto] || 0) + s.cantidad_actual
    })

    const bajos = productos?.filter(p => (stockPorProducto[p.id_producto] || 0) < p.stock_minimo) || []
    setStockBajo(bajos)

    // Movimientos hoy
    const hoy = new Date().toISOString().split('T')[0]
    const { count: movHoy } = await supabase
      .from('movimientos')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', hoy)
    setMovimientosHoy(movHoy || 0)

    // Últimos movimientos
    const { data: ultMov } = await supabase
      .from('movimientos')
      .select('*, detalle_movimientos(cantidad, productos(nombre))')
      .order('fecha', { ascending: false })
      .limit(5)

    const movConUsuario = await Promise.all((ultMov || []).map(async (m) => {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('id', m.id_usuario)
        .single()
      return { ...m, nombre_usuario: perfil?.nombre || '-' }
    }))
    setUltimosMovimientos(movConUsuario)

    setLoading(false)
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-PE',{ timeZone: 'America/Lima' })
  }

  function formatTipo(tipo) {
    const tipos = {
      ingreso_proveedor: 'Ingreso Proveedor',
      ingreso_produccion: 'Ingreso Producción',
      salida_venta: 'Salida Venta',
      traslado: 'Traslado',
    }
    return tipos[tipo] || tipo
  }

  function colorTipo(tipo) {
    if (tipo.includes('ingreso')) return 'bg-green-100 text-green-700'
    if (tipo.includes('salida')) return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Dashboard</h2>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Productos</p>
          <p className="text-2xl font-bold text-blue-600">{totalProductos}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Stock Bajo</p>
          <p className="text-2xl font-bold text-red-500">{stockBajo.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Movimientos Hoy</p>
          <p className="text-2xl font-bold text-green-500">{movimientosHoy}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Alertas Activas</p>
          <p className="text-2xl font-bold text-yellow-500">{stockBajo.length}</p>
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {stockBajo.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-red-700 mb-2">⚠️ Productos con stock crítico:</h3>
          <div className="flex flex-wrap gap-2">
            {stockBajo.map(p => (
              <span key={p.id_producto} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs">
                {p.nombre} (mín: {p.stock_minimo})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Últimos movimientos */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Últimos movimientos</h3>
        {loading ? (
          <p className="text-center text-gray-400 py-4">Cargando...</p>
        ) : ultimosMovimientos.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No hay movimientos registrados aún.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-left">Cantidad</th>
                <th className="px-4 py-2 text-left">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {ultimosMovimientos.map(m => (
                <tr key={m.id_movimiento} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs">{formatFecha(m.fecha)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${colorTipo(m.tipo)}`}>
                      {formatTipo(m.tipo)}
                    </span>
                  </td>
                  <td className="px-4 py-2">{m.detalle_movimientos?.[0]?.productos?.nombre || '-'}</td>
                  <td className="px-4 py-2">{m.detalle_movimientos?.[0]?.cantidad || '-'}</td>
                  <td className="px-4 py-2">{m.nombre_usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}

export default Dashboard