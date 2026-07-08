import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function ConsultaStock() {
  const [todosProductos, setTodosProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaMarca, setBusquedaMarca] = useState('')
  const [busquedaAlmacen, setBusquedaAlmacen] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    setLoading(true)

    const { data: stockData } = await supabase
      .from('stock')
      .select('*, productos(nombre, marca, unidad_medida, precio_minorista, precio_referencia), ubicaciones(nombre, tipo)')

    const agrupado = {}
    stockData?.forEach(s => {
      const id = s.id_producto
      if (!agrupado[id]) {
        agrupado[id] = {
          id_producto: id,
          nombre: s.productos?.nombre,
          marca: s.productos?.marca || '-',
          unidad_medida: s.productos?.unidad_medida,
          precio: s.productos?.precio_minorista || s.productos?.precio_referencia,
          totalStock: 0,
          ubicaciones: []
        }
      }
      agrupado[id].totalStock += s.cantidad_actual
      if (s.cantidad_actual > 0) {
        agrupado[id].ubicaciones.push({
          nombre: s.ubicaciones?.nombre,
          tipo: s.ubicaciones?.tipo,
          cantidad: s.cantidad_actual
        })
      }
    })

    const lista = Object.values(agrupado)
      .filter(p => p.totalStock > 0)
      .sort((a, b) => b.totalStock - a.totalStock)

    setTodosProductos(lista)
    setLoading(false)
  }

  const productosFiltrados = todosProductos.filter(p => {
    const cumpleNombre = busqueda === '' || p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    const cumpleMarca = busquedaMarca === '' || (p.marca || '').toLowerCase().includes(busquedaMarca.toLowerCase())
    const cumpleAlmacen = busquedaAlmacen === '' || p.ubicaciones.some(u => u.nombre?.toLowerCase().includes(busquedaAlmacen.toLowerCase()))
    return cumpleNombre && cumpleMarca && cumpleAlmacen
  }).slice(0, busqueda || busquedaMarca || busquedaAlmacen ? 100 : 20)

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Consultar Stock</h2>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Marca</label>
            <input
              type="text"
              placeholder="Buscar por marca..."
              value={busquedaMarca}
              onChange={(e) => setBusquedaMarca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Almacén</label>
            <input
              type="text"
              placeholder="Buscar por almacén..."
              value={busquedaAlmacen}
              onChange={(e) => setBusquedaAlmacen(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {busqueda || busquedaMarca || busquedaAlmacen
            ? `Mostrando ${productosFiltrados.length} resultados`
            : 'Mostrando 20 productos con más stock. Usa los filtros para buscar más.'}
        </p>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Marca</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Precio</th>
              <th className="px-4 py-3 text-left">Stock Total</th>
              <th className="px-4 py-3 text-left">Distribución por almacén</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : productosFiltrados.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">No se encontraron productos.</td></tr>
            ) : (
              productosFiltrados.map((p, i) => (
                <tr key={p.id_producto} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unidad_medida}</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">S/ {p.precio}</td>
                  <td className="px-4 py-3">
                    <span className="font-black text-blue-600 text-lg">{p.totalStock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.ubicaciones.map((u, j) => (
                        <span key={j} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          📦 {u.nombre}: {u.cantidad}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default ConsultaStock