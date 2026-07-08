import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { registrarAuditoria } from '../utils/auditoria'

function Mermas() {
  const { user } = useAuth()
  const [productos, setProductos] = useState([])
  const [stockDisponible, setStockDisponible] = useState(null)
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('')
  const [mermas, setMermas] = useState([])
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [form, setForm] = useState({ id_producto: '', cantidad: '', motivo: '' })

  // Filtros
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroAlmacen, setFiltroAlmacen] = useState('')
  const [filtroMotivo, setFiltroMotivo] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [ubicaciones, setUbicaciones] = useState([])

  useEffect(() => {
    cargarProductos()
    cargarMermas()
    cargarUbicaciones()
  }, [])

  async function cargarProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setProductos(data || [])
  }

  async function cargarUbicaciones() {
    const { data } = await supabase.from('ubicaciones').select('*').eq('activo', true).order('nombre')
    setUbicaciones(data || [])
  }

  async function cargarMermas(conFiltros = false) {
    let query = supabase
      .from('movimientos')
      .select(`*, detalle_movimientos(
        cantidad,
        productos(nombre, marca),
        ubicaciones_origen:ubicaciones!detalle_movimientos_id_ubicacion_origen_fkey(nombre)
      )`)
      .eq('tipo', 'merma')
      .order('fecha', { ascending: false })

    if (filtroFechaInicio) query = query.gte('fecha', filtroFechaInicio)
    if (filtroFechaFin) query = query.lte('fecha', filtroFechaFin + 'T23:59:59')
    if (!conFiltros) query = query.limit(20)

    const { data } = await query

    if (data) {
      let mermasConUsuario = await Promise.all(data.map(async (m) => {
        const { data: perfil } = await supabase
          .from('perfiles').select('nombre').eq('id', m.id_usuario).single()
        return { ...m, nombre_usuario: perfil?.nombre || '-' }
      }))

      if (filtroProducto) {
        mermasConUsuario = mermasConUsuario.filter(m =>
          m.detalle_movimientos?.[0]?.productos?.nombre?.toLowerCase().includes(filtroProducto.toLowerCase())
        )
      }
      if (filtroAlmacen) {
        mermasConUsuario = mermasConUsuario.filter(m =>
          m.detalle_movimientos?.[0]?.ubicaciones_origen?.nombre?.toLowerCase().includes(filtroAlmacen.toLowerCase())
        )
      }
      if (filtroMotivo) {
        mermasConUsuario = mermasConUsuario.filter(m =>
          m.observacion?.toLowerCase().includes(filtroMotivo.toLowerCase())
        )
      }
      if (filtroUsuario) {
        mermasConUsuario = mermasConUsuario.filter(m =>
          m.nombre_usuario.toLowerCase().includes(filtroUsuario.toLowerCase())
        )
      }

      setMermas(mermasConUsuario)
    }
  }

  async function consultarStock(id_producto) {
    if (!id_producto) return
    const { data } = await supabase
      .from('stock')
      .select('*, ubicaciones(nombre, tipo)')
      .eq('id_producto', parseInt(id_producto))
      .gt('cantidad_actual', 0)
    setStockDisponible(data || [])
    setUbicacionSeleccionada('')
  }

  async function handleGuardar() {
    if (!form.id_producto || !form.cantidad || !ubicacionSeleccionada || !form.motivo) {
      alert('Todos los campos son obligatorios')
      return
    }
    if (parseInt(form.cantidad) <= 0) {
      alert('La cantidad debe ser mayor a cero')
      return
    }

    const stockUbicacion = stockDisponible?.find(s => s.id_ubicacion === parseInt(ubicacionSeleccionada))
    if (!stockUbicacion || parseInt(form.cantidad) > stockUbicacion.cantidad_actual) {
      alert('Stock insuficiente. Disponible: ' + (stockUbicacion?.cantidad_actual || 0))
      return
    }

    setLoading(true)

    const { data: movimiento, error } = await supabase
      .from('movimientos')
      .insert({ tipo: 'merma', id_usuario: user.id, observacion: form.motivo })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
      return
    }

    await supabase.from('detalle_movimientos').insert({
      id_movimiento: movimiento.id_movimiento,
      id_producto: parseInt(form.id_producto),
      id_ubicacion_origen: parseInt(ubicacionSeleccionada),
      cantidad: parseInt(form.cantidad),
    })

    await supabase.from('stock')
      .update({ cantidad_actual: stockUbicacion.cantidad_actual - parseInt(form.cantidad) })
      .eq('id_stock', stockUbicacion.id_stock)

    await registrarAuditoria(user?.id, 'Merma registrada: ' + form.motivo, 'Mermas')

    setLoading(false)
    setExito(true)
    setStockDisponible(null)
    setUbicacionSeleccionada('')
    setForm({ id_producto: '', cantidad: '', motivo: '' })
    cargarMermas()
    setTimeout(() => setExito(false), 3000)
  }

  function handleBuscar() {
    setBuscando(true)
    cargarMermas(true)
  }

  function handleLimpiar() {
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    setFiltroProducto('')
    setFiltroAlmacen('')
    setFiltroMotivo('')
    setFiltroUsuario('')
    setBuscando(false)
    cargarMermas(false)
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-PE')
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Registro de Mermas</h2>

      {exito && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          ✅ Merma registrada correctamente. Stock descontado.
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl mb-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Registrar Merma</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Producto *</label>
            <select
              value={form.id_producto}
              onChange={(e) => {
                setForm({ ...form, id_producto: e.target.value })
                consultarStock(e.target.value)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="">Seleccionar producto</option>
              {productos.map(p => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre} {p.marca ? `(${p.marca})` : ''}
                </option>
              ))}
            </select>
          </div>

          {stockDisponible !== null && stockDisponible.length > 0 && (
            <div>
              <label className="text-sm text-gray-600">Almacén de origen *</label>
              <select
                value={ubicacionSeleccionada}
                onChange={(e) => setUbicacionSeleccionada(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">Seleccionar almacén</option>
                {stockDisponible.map((s, i) => (
                  <option key={i} value={s.id_ubicacion}>
                    {s.ubicaciones?.nombre} — Stock: {s.cantidad_actual}
                  </option>
                ))}
              </select>
            </div>
          )}

          {stockDisponible !== null && stockDisponible.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">Sin stock disponible.</p>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">Cantidad *</label>
            <input
              type="number"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              min="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Motivo *</label>
            <select
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="">Seleccionar motivo</option>
              <option value="Producto vencido">Producto vencido</option>
              <option value="Producto dañado">Producto dañado</option>
              <option value="Producto perdido">Producto perdido</option>
              <option value="Error de inventario">Error de inventario</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGuardar}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Merma'}
            </button>
            <button
              onClick={() => { setForm({ id_producto: '', cantidad: '', motivo: '' }); setStockDisponible(null); setUbicacionSeleccionada('') }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Historial de Mermas</h3>

        {/* Filtros */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500">Fecha inicio</label>
            <input type="date" value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Fecha fin</label>
            <input type="date" value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Producto</label>
            <input type="text" placeholder="Buscar producto..." value={filtroProducto}
              onChange={(e) => setFiltroProducto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Almacén</label>
            <input type="text" placeholder="Buscar almacén..." value={filtroAlmacen}
              onChange={(e) => setFiltroAlmacen(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Motivo</label>
            <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">Todos</option>
              <option value="Producto vencido">Producto vencido</option>
              <option value="Producto dañado">Producto dañado</option>
              <option value="Producto perdido">Producto perdido</option>
              <option value="Error de inventario">Error de inventario</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Usuario</label>
            <input type="text" placeholder="Buscar usuario..." value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={handleBuscar}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            Buscar
          </button>
          <button onClick={handleLimpiar}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">
            Limpiar
          </button>
        </div>

        {!buscando && <p className="text-xs text-gray-400 mb-3">Mostrando últimas 20 mermas.</p>}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Marca</th>
              <th className="px-4 py-3 text-left">Cantidad</th>
              <th className="px-4 py-3 text-left">Almacén</th>
              <th className="px-4 py-3 text-left">Motivo</th>
              <th className="px-4 py-3 text-left">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {mermas.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">No hay mermas registradas.</td></tr>
            ) : (
              mermas.map(m => (
                <tr key={m.id_movimiento} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">{formatFecha(m.fecha)}</td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.productos?.nombre || '-'}</td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.productos?.marca || '-'}</td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.cantidad || '-'}</td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.ubicaciones_origen?.nombre || '-'}</td>
                  <td className="px-4 py-3">{m.observacion || '-'}</td>
                  <td className="px-4 py-3">{m.nombre_usuario}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Mermas