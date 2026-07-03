import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Auditoria() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    cargarLogs()
  }, [])

  async function cargarLogs(conFiltros = false) {
    setLoading(true)

    let query = supabase
      .from('auditoria_logs')
      .select('*')
      .order('fecha_hora', { ascending: false })

    if (filtroFechaInicio) query = query.gte('fecha_hora', filtroFechaInicio)
    if (filtroFechaFin) query = query.lte('fecha_hora', filtroFechaFin + 'T23:59:59')
    if (filtroModulo) query = query.eq('tabla_afectada', filtroModulo)

    if (!conFiltros) query = query.limit(20)

    const { data } = await query

    if (data) {
      const logsConUsuario = await Promise.all(data.map(async (log) => {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre')
          .eq('id', log.id_usuario)
          .single()
        return { ...log, nombre_usuario: perfil?.nombre || '-' }
      }))

      const filtrados = filtroUsuario
        ? logsConUsuario.filter(l => l.nombre_usuario.toLowerCase().includes(filtroUsuario.toLowerCase()))
        : logsConUsuario

      setLogs(filtrados)
    }
    setLoading(false)
  }

  function handleBuscar() {
    setBuscando(true)
    cargarLogs(true)
  }

  function handleLimpiar() {
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    setFiltroModulo('')
    setFiltroUsuario('')
    setBuscando(false)
    cargarLogs(false)
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-PE')
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Auditoría de Acciones</h2>

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
            <label className="text-xs text-gray-500 mb-1 block">Módulo</label>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="Productos">Productos</option>
              <option value="Usuarios">Usuarios</option>
              <option value="Clientes">Clientes</option>
              <option value="Mermas">Mermas</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Usuario</label>
            <input
              type="text"
              placeholder="Buscar por usuario..."
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBuscar}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Buscar
          </button>
          <button
            onClick={handleLimpiar}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
          >
            Limpiar
          </button>
        </div>
        {!buscando && (
          <p className="text-xs text-gray-400 mt-2">Mostrando últimos 20 registros. Usa los filtros para ver más.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Fecha y Hora</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Acción</th>
              <th className="px-4 py-3 text-left">Módulo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">No hay registros de auditoría.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id_log} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">{formatFecha(log.fecha_hora)}</td>
                  <td className="px-4 py-3">{log.nombre_usuario}</td>
                  <td className="px-4 py-3">{log.accion_realizada}</td>
                  <td className="px-4 py-3">{log.tabla_afectada || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Auditoria