import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function ConsultaStock() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [stockDetalle, setStockDetalle] = useState(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarProductos()
  }, [])

  async function cargarProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setProductos(data || [])
  }

  async function buscarStock() {
    if (!busqueda.trim()) return
    setLoading(true)

    const { data: producto } = await supabase
      .from('productos')
      .select('*')
      .ilike('nombre', `%${busqueda}%`)
      .eq('activo', true)
      .single()

    if (!producto) {
      setProductoSeleccionado(null)
      setStockDetalle([])
      setLoading(false)
      return
    }

    setProductoSeleccionado(producto)

    const { data: stock } = await supabase
      .from('stock')
      .select('cantidad_actual, ubicaciones(nombre, tipo)')
      .eq('id_producto', producto.id_producto)

    setStockDetalle(stock || [])
    setLoading(false)
  }

  async function seleccionarProducto(producto) {
    setBusqueda(producto.nombre)
    setProductoSeleccionado(producto)

    const { data: stock } = await supabase
      .from('stock')
      .select('cantidad_actual, ubicaciones(nombre, tipo)')
      .eq('id_producto', producto.id_producto)

    setStockDetalle(stock || [])
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalStock = stockDetalle?.reduce((sum, s) => sum + s.cantidad_actual, 0) || 0

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Consultar Stock y Ubicación</h2>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setStockDetalle(null) }}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={buscarStock}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Buscar
          </button>
        </div>

        {/* Sugerencias */}
        {busqueda && !productoSeleccionado && productosFiltrados.length > 0 && (
          <div className="border border-gray-200 rounded-lg mt-2 max-h-40 overflow-y-auto">
            {productosFiltrados.map(p => (
              <div
                key={p.id_producto}
                onClick={() => seleccionarProducto(p)}
                className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer"
              >
                {p.nombre}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resultado */}
      {stockDetalle !== null && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          {!productoSeleccionado ? (
            <p className="text-red-500 text-sm">Producto no encontrado.</p>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{productoSeleccionado.nombre}</h3>
              <p className="text-sm text-gray-500 mb-1">Precio referencia: S/ {productoSeleccionado.precio_referencia}</p>
              <p className="text-sm text-gray-500 mb-4">Unidad: {productoSeleccionado.unidad_medida}</p>

              {stockDetalle.length === 0 ? (
                <p className="text-red-500 text-sm">Sin stock disponible.</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-blue-700 mb-3">
                    Stock total disponible: {totalStock} unidades
                  </p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Almacén / Tienda</th>
                        <th className="px-4 py-2 text-left">Tipo</th>
                        <th className="px-4 py-2 text-left">Cantidad disponible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockDetalle.map((s, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-4 py-2">{s.ubicaciones?.nombre}</td>
                          <td className="px-4 py-2 capitalize">{s.ubicaciones?.tipo}</td>
                          <td className="px-4 py-2 font-semibold">{s.cantidad_actual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  )
}

export default ConsultaStock