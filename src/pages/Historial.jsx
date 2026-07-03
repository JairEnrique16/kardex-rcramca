import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Historial() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    cargarHistorial()
  }, [])

  async function cargarHistorial(conFiltros = false) {
    setLoading(true)

    let query = supabase
      .from('movimientos')
      .select(`*, detalle_movimientos(
          cantidad,
          productos(nombre),
          ubicaciones_origen:ubicaciones!detalle_movimientos_id_ubicacion_origen_fkey(nombre),
          ubicaciones_destino:ubicaciones!detalle_movimientos_id_ubicacion_destino_fkey(nombre)
        )`)
      .order('fecha', { ascending: false })

    if (filtroFechaInicio) query = query.gte('fecha', filtroFechaInicio)
    if (filtroFechaFin) query = query.lte('fecha', filtroFechaFin + 'T23:59:59')
    if (filtroTipo) query = query.eq('tipo', filtroTipo)

    if (!conFiltros) query = query.limit(20)

    const { data } = await query

    const movConUsuario = await Promise.all((data || []).map(async (m) => {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('id', m.id_usuario)
        .single()
      return { ...m, nombre_usuario: perfil?.nombre || '-' }
    }))

    setMovimientos(movConUsuario)
    setLoading(false)
  }

  function handleBuscar() {
    setBuscando(true)
    cargarHistorial(true)
  }

  function handleLimpiar() {
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    setFiltroTipo('')
    setBuscando(false)
    cargarHistorial(false)
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-PE')
  }

  function formatTipo(tipo) {
    const tipos = {
      ingreso_proveedor: 'Ingreso Proveedor',
      ingreso_produccion: 'Ingreso Producción',
      salida_venta: 'Salida Venta',
      traslado: 'Traslado',
      merma: 'Merma',
    }
    return tipos[tipo] || tipo
  }

  function colorTipo(tipo) {
    if (tipo.includes('ingreso')) return 'bg-green-100 text-green-700'
    if (tipo.includes('salida')) return 'bg-red-100 text-red-700'
    if (tipo === 'merma') return 'bg-orange-100 text-orange-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Historial de Movimientos</h2>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-4 gap-4 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha inicio</label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha fin</label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tipo de movimiento</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="ingreso_proveedor">Ingreso Proveedor</option>
              <option value="ingreso_produccion">Ingreso Producción</option>
              <option value="salida_venta">Salida Venta</option>
              <option value="traslado">Traslado</option>
              <option value="merma">Merma</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleBuscar}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Buscar
            </button>
            <button
              onClick={handleLimpiar}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
        {!buscando && (
          <p className="text-xs text-gray-400">Mostrando últimos 20 movimientos. Usa los filtros para ver más.</p>
        )}
        {buscando && (
          <p className="text-xs text-blue-500">Mostrando todos los resultados según filtros aplicados.</p>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Cantidad</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-left">Destino</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Observación</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : movimientos.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-400">No hay movimientos registrados.</td></tr>
            ) : (
              movimientos.map(m => (
                <tr key={m.id_movimiento} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">{formatFecha(m.fecha)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${colorTipo(m.tipo)}`}>
                      {formatTipo(m.tipo)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.productos?.nombre || '-'}</td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.cantidad || '-'}</td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.ubicaciones_origen?.nombre || '-'}</td>
                  <td className="px-4 py-3">{m.detalle_movimientos?.[0]?.ubicaciones_destino?.nombre || '-'}</td>
                  <td className="px-4 py-3">{m.nombre_usuario}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.observacion || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Historial