import { registrarAuditoria } from '../utils/auditoria'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function Productos() {
  const { user } = useAuth()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [stockData, setStockData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroUnidad, setFiltroUnidad] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroMarca, setFiltroMarca] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    unidad_medida: '',
    precio_minorista: '',
    precio_mayorista: '',
    cantidad_minima_mayorista: '6',
    stock_minimo: '',
    id_categoria: '',
    marca: '',
  })

  useEffect(() => {
    cargarProductos()
    cargarCategorias()
    cargarStock()
  }, [])

  async function cargarProductos() {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .order('id_producto', { ascending: false })
      .limit(20)
    setProductos(data || [])
    setLoading(false)
  }

  async function cargarCategorias() {
    const { data } = await supabase.from('categorias').select('*')
    setCategorias(data || [])
  }

  async function cargarStock() {
    const { data } = await supabase.from('stock').select('id_producto, cantidad_actual')
    setStockData(data || [])
  }

  function getStockActual(id_producto) {
    return stockData
      .filter(s => s.id_producto === id_producto)
      .reduce((sum, s) => sum + s.cantidad_actual, 0)
  }

  function handleEditar(p) {
    setEditando(p.id_producto)
    setForm({
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      unidad_medida: p.unidad_medida || '',
      precio_minorista: (p.precio_minorista ?? p.precio_referencia ?? '').toString(),
      precio_mayorista: (p.precio_mayorista ?? '').toString(),
      cantidad_minima_mayorista: (p.cantidad_minima_mayorista ?? 6).toString(),
      stock_minimo: (p.stock_minimo ?? '').toString(),
      id_categoria: p.id_categoria ? p.id_categoria.toString() : '',
      marca: p.marca || '',
    })
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  function cerrarForm() {
    setShowForm(false)
    setEditando(null)
    setForm({ nombre: '', descripcion: '', unidad_medida: '', precio_minorista: '', precio_mayorista: '', cantidad_minima_mayorista: '6', stock_minimo: '', id_categoria: '', marca: '' })
  }

  async function handleGuardar() {
    if (!form.nombre || !form.unidad_medida || !form.stock_minimo) {
      alert('Nombre, unidad de medida y stock mínimo son obligatorios')
      return
    }

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      unidad_medida: form.unidad_medida,
      precio_referencia: parseFloat(form.precio_minorista) || 0,
      precio_minorista: parseFloat(form.precio_minorista) || 0,
      precio_mayorista: parseFloat(form.precio_mayorista) || 0,
      cantidad_minima_mayorista: parseInt(form.cantidad_minima_mayorista) || 6,
      stock_minimo: parseInt(form.stock_minimo),
      id_categoria: parseInt(form.id_categoria) || null,
      marca: form.marca || null,
    }

    if (editando) {
      const { error } = await supabase.from('productos').update(payload).eq('id_producto', editando)

      if (error) {
        alert('Error: ' + error.message)
      } else {
        await registrarAuditoria(user?.id, 'Producto editado: ' + form.nombre, 'Productos')
        cerrarForm()
        cargarProductos()
        cargarStock()
      }
    } else {
      const { error } = await supabase.from('productos').insert({
        ...payload,
        activo: true,
      })

      if (error) {
        alert('Error: ' + error.message)
      } else {
        await registrarAuditoria(user?.id, 'Registro nuevo de producto: ' + form.nombre, 'Productos')
        cerrarForm()
        cargarProductos()
        cargarStock()
      }
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

  const unidades = [...new Set(productos.map(p => p.unidad_medida).filter(Boolean))]
  const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean))]

  const productosFiltrados = productos.filter(p => {
    const cumpleNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const cumpleCat = filtroCat ? p.id_categoria === parseInt(filtroCat) : true
    const cumpleUnidad = filtroUnidad ? p.unidad_medida === filtroUnidad : true
    const cumpleEstado = filtroEstado === '' ? true : filtroEstado === 'activo' ? p.activo : !p.activo
    const cumpleMarca = filtroMarca ? p.marca === filtroMarca : true
    return cumpleNombre && cumpleCat && cumpleUnidad && cumpleEstado && cumpleMarca
  })

  return (
    <Layout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-700">Productos</h2>
        <button
          onClick={() => { setEditando(null); setShowForm(true) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Agregar producto
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />

        <select
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={filtroUnidad}
          onChange={(e) => setFiltroUnidad(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las Presentaciones</option>
          {unidades.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">
            {editando ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600">Nombre *</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Pressentacion*</label>
              <input type="text" value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                placeholder="Ej: Unidad, Caja x12, Bolsa 1kg"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Marca</label>
              <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Precio Minorista *</label>
              <input type="number" value={form.precio_minorista} onChange={(e) => setForm({ ...form, precio_minorista: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Precio Mayorista *</label>
              <input type="number" value={form.precio_mayorista} onChange={(e) => setForm({ ...form, precio_mayorista: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Cant. mínima mayorista</label>
              <input type="number" value={form.cantidad_minima_mayorista} onChange={(e) => setForm({ ...form, cantidad_minima_mayorista: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>

            <div>
              <label className="text-sm text-gray-600">Stock mínimo *</label>
              <input type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Categoría</label>
              <select value={form.id_categoria} onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">Seleccionar categoría</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Descripción</label>
              <input type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleGuardar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
            <button onClick={cerrarForm}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Marca</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Presentacion</th>
              <th className="px-4 py-3 text-left">P. Minorista</th>
              <th className="px-4 py-3 text-left">P. Mayorista</th>
              <th className="px-4 py-3 text-left">Stock actual</th>
              <th className="px-4 py-3 text-left">Stock mín.</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>

            {loading ? (
              <tr><td colSpan="11" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : productosFiltrados.length === 0 ? (
              <tr><td colSpan="11" className="text-center py-8 text-gray-400">No hay productos registrados.</td></tr>
            ) : (
              productosFiltrados.map(p => {
                const stockActual = getStockActual(p.id_producto)
                const stockBajo = stockActual < p.stock_minimo
                return (
                  <tr key={p.id_producto} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{p.id_producto}</td>
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3">{p.marca || '-'}</td>
                    <td className="px-4 py-3">{p.categorias?.nombre || '-'}</td>
                    <td className="px-4 py-3">{p.unidad_medida}</td>
                    <td className="px-4 py-3">S/ {p.precio_minorista || p.precio_referencia}</td>
                    <td className="px-4 py-3">S/ {p.precio_mayorista || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${stockBajo ? 'text-red-500' : 'text-green-600'}`}>
                        {stockActual}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.stock_minimo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleEditar(p)}
                        className="text-blue-500 hover:text-blue-700 text-xs">Editar</button>
                      {p.activo ? (
                        <button onClick={() => handleDesactivar(p.id_producto)}
                          className="text-orange-500 hover:text-orange-700 text-xs">Desactivar</button>
                      ) : (
                        <button onClick={() => handleActivar(p.id_producto)}
                          className="text-green-500 hover:text-green-700 text-xs">Activar</button>
                      )}
                      <button onClick={() => handleEliminar(p.id_producto)}
                        className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Productos