import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Reportes() {
  const [reporteStockBajo, setReporteStockBajo] = useState([])
  const [reporteMovimientos, setReporteMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  useEffect(() => {
    cargarReportes()
  }, [])

  async function cargarReportes() {
    setLoading(true)

    // Reporte stock bajo
    const { data: productos } = await supabase
      .from('productos')
      .select('id_producto, nombre, stock_minimo, unidad_medida, categorias(nombre)')
      .eq('activo', true)

    const { data: stockData } = await supabase
      .from('stock')
      .select('id_producto, cantidad_actual')

    const stockPorProducto = {}
    stockData?.forEach(s => {
      stockPorProducto[s.id_producto] = (stockPorProducto[s.id_producto] || 0) + s.cantidad_actual
    })

    const bajos = productos?.map(p => ({
      ...p,
      stock_actual: stockPorProducto[p.id_producto] || 0
    })).filter(p => p.stock_actual < p.stock_minimo) || []

    setReporteStockBajo(bajos)

    // Reporte movimientos por producto
    const { data: detalles } = await supabase
      .from('detalle_movimientos')
      .select('id_producto, cantidad, productos(nombre), movimientos(tipo, fecha)')

    const movPorProducto = {}
    detalles?.forEach(d => {
      if (d.movimientos?.tipo === 'salida_venta') {
        const nombre = d.productos?.nombre || 'Desconocido'
        movPorProducto[nombre] = (movPorProducto[nombre] || 0) + d.cantidad
      }
    })

    const reporte = Object.entries(movPorProducto)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    setReporteMovimientos(reporte)
    setLoading(false)
  }

  async function filtrarPorFecha() {
    if (!fechaInicio || !fechaFin) {
      alert('Selecciona fecha de inicio y fin')
      return
    }
    setLoading(true)

    const { data: detalles } = await supabase
      .from('detalle_movimientos')
      .select('id_producto, cantidad, productos(nombre), movimientos(tipo, fecha)')
      .gte('movimientos.fecha', fechaInicio)
      .lte('movimientos.fecha', fechaFin + 'T23:59:59')

    const movPorProducto = {}
    detalles?.forEach(d => {
      if (d.movimientos?.tipo === 'salida_venta') {
        const nombre = d.productos?.nombre || 'Desconocido'
        movPorProducto[nombre] = (movPorProducto[nombre] || 0) + d.cantidad
      }
    })

    const reporte = Object.entries(movPorProducto)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    setReporteMovimientos(reporte)
    setLoading(false)
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Reportes</h2>

      {/* Reporte productos más vendidos */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Productos más vendidos</h3>

        <div className="flex gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-600">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={filtrarPorFecha}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Filtrar
            </button>
            <button
              onClick={cargarReportes}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Ver todo
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-4">Cargando...</p>
        ) : reporteMovimientos.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No hay ventas registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-left">Unidades vendidas</th>
              </tr>
            </thead>
            <tbody>
              {reporteMovimientos.map((r, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-blue-600">{i + 1}</td>
                  <td className="px-4 py-2">{r.nombre}</td>
                  <td className="px-4 py-2 font-semibold">{r.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reporte stock bajo */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Productos con stock bajo</h3>
        {loading ? (
          <p className="text-center text-gray-400 py-4">Cargando...</p>
        ) : reporteStockBajo.length === 0 ? (
          <p className="text-center text-green-600 py-4">✅ Todos los productos tienen stock suficiente.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-left">Categoría</th>
                <th className="px-4 py-2 text-left">Stock actual</th>
                <th className="px-4 py-2 text-left">Stock mínimo</th>
                <th className="px-4 py-2 text-left">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {reporteStockBajo.map((p, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.nombre}</td>
                  <td className="px-4 py-2">{p.categorias?.nombre || '-'}</td>
                  <td className="px-4 py-2 text-red-600 font-semibold">{p.stock_actual}</td>
                  <td className="px-4 py-2">{p.stock_minimo}</td>
                  <td className="px-4 py-2">{p.unidad_medida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}

export default Reportes