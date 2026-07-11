import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function ConsultaPrecios() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaMarca, setBusquedaMarca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarProductos()
    cargarCategorias()
  }, [])

  async function cargarProductos() {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('activo', true)
      .order('nombre')
      .limit(20)
    setProductos(data || [])
    setLoading(false)
  }

  async function cargarCategorias() {
    const { data } = await supabase.from('categorias').select('*').order('nombre')
    setCategorias(data || [])
  }

  const productosFiltrados = productos.filter(p => {
    const cumpleNombre = busqueda === '' || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const cumpleMarca = busquedaMarca === '' || (p.marca || '').toLowerCase().includes(busquedaMarca.toLowerCase())
    const cumpleCategoria = filtroCategoria === '' || p.id_categoria === parseInt(filtroCategoria)
    return cumpleNombre && cumpleMarca && cumpleCategoria
  })

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Consultar Precios</h2>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
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
            <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Mostrando primeros 20 productos por defecto.</p>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Marca</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Precio Minorista</th>
              <th className="px-4 py-3 text-left">Precio Mayorista</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : productosFiltrados.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">No se encontraron productos.</td></tr>
            ) : (
              productosFiltrados.map(p => (
                <tr key={p.id_producto} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.marca || '-'}</td>
                  <td className="px-4 py-3">{p.categorias?.nombre || '-'}</td>
                  <td className="px-4 py-3">{p.unidad_medida}</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">
                    S/ {p.precio_minorista || p.precio_referencia || '-'}
                  </td>
                  <td className="px-4 py-3 text-purple-600 font-semibold">
                    S/ {p.precio_mayorista || '-'}
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