import { registrarAuditoria } from '../utils/auditoria'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function Productos() {
  const { user } = useAuth()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    unidad_medida: '',
    precio_referencia: '',
    stock_minimo: '',
    id_categoria: '',
  })

  useEffect(() => {
    cargarProductos()
    cargarCategorias()
  }, [])

  async function cargarProductos() {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .order('id_producto', { ascending: true })
    setProductos(data || [])
    setLoading(false)
  }

  async function cargarCategorias() {
    const { data } = await supabase.from('categorias').select('*')
    setCategorias(data || [])
  }

  async function handleGuardar() {
    if (!form.nombre || !form.unidad_medida || !form.stock_minimo) {
      alert('Nombre, unidad de medida y stock mínimo son obligatorios')
      return
    }
    const { error } = await supabase.from('productos').insert({
      nombre: form.nombre,
      descripcion: form.descripcion,
      unidad_medida: form.unidad_medida,
      precio_referencia: parseFloat(form.precio_referencia) || 0,
      stock_minimo: parseInt(form.stock_minimo),
      id_categoria: parseInt(form.id_categoria) || null,
      activo: true,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      await registrarAuditoria(user?.id, 'Registro nuevo de producto: ' + form.nombre, 'Productos')
      setShowForm(false)
      setForm({ nombre: '', descripcion: '', unidad_medida: '', precio_referencia: '', stock_minimo: '', id_categoria: '' })
      cargarProductos()
    }
  }

  async function handleDesactivar(id) {
    if (!confirm('¿Desactivar este producto?')) return
    await supabase.from('productos').update({ activo: false }).eq('id_producto', id)
    await registrarAuditoria(user?.id, 'Producto desactivado', 'Productos')
    cargarProductos()
  }

  async function handleActivar(id) {
    await supabase.from('productos').update({ activo: true }).eq('id_producto', id)
    await registrarAuditoria(user?.id, 'Producto activado', 'Productos')
    cargarProductos()
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar permanentemente este producto?')) return
    await supabase.from('productos').delete().eq('id_producto', id)
    await registrarAuditoria(user?.id, 'Producto eliminado', 'Productos')
    cargarProductos()
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Productos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Agregar producto
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nuevo Producto</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Unidad de medida *</label>
              <input
                type="text"
                value={form.unidad_medida}
                onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                placeholder="Ej: Unidad, Kg, Litro"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Precio referencia</label>
              <input
                type="number"
                value={form.precio_referencia}
                onChange={(e) => setForm({ ...form, precio_referencia: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Stock mínimo *</label>
              <input
                type="number"
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Categoría</label>
              <select
                value={form.id_categoria}
                onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Descripción</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleGuardar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Guardar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Precio</th>
              <th className="px-4 py-3 text-left">Stock mín.</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : productosFiltrados.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-400">No hay productos registrados.</td></tr>
            ) : (
              productosFiltrados.map(p => (
                <tr key={p.id_producto} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{p.id_producto}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.categorias?.nombre || '-'}</td>
                  <td className="px-4 py-3">{p.unidad_medida}</td>
                  <td className="px-4 py-3">S/ {p.precio_referencia}</td>
                  <td className="px-4 py-3">{p.stock_minimo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {p.activo ? (
                      <button
                        onClick={() => handleDesactivar(p.id_producto)}
                        className="text-orange-500 hover:text-orange-700 text-xs"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivar(p.id_producto)}
                        className="text-green-500 hover:text-green-700 text-xs"
                      >
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => handleEliminar(p.id_producto)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Eliminar
                    </button>
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

export default Productos