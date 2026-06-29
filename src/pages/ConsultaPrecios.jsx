import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function ConsultaPrecios() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarProductos()
  }, [])

  async function cargarProductos() {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('activo', true)
      .order('nombre')
    setProductos(data || [])
    setLoading(false)
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Consultar Precios</h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Precio Minorista</th>
              <th className="px-4 py-3 text-left">Precio Mayorista</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : productosFiltrados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">No se encontraron productos.</td></tr>
            ) : (
              productosFiltrados.map(p => (
                <tr key={p.id_producto} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.categorias?.nombre || '-'}</td>
                  <td className="px-4 py-3">{p.unidad_medida}</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">
                    S/ {p.precio_referencia}
                  </td>
                  <td className="px-4 py-3 text-purple-600 font-semibold">
                    S/ {p.precio_referencia ? (p.precio_referencia * 0.85).toFixed(2) : '-'}
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

export default ConsultaPrecios