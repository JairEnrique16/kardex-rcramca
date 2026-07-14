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

  function colorModulo(modulo) {
    const colores = {
      Productos: 'bg-brand-blue/10 text-brand-blue',
      Usuarios: 'bg-purple-50 text-purple-600',
      Clientes: 'bg-amber-50 text-amber-600',
      Mermas: 'bg-danger/10 text-danger-dark',
    }
    return colores[modulo] || 'bg-gray-100 text-gray-500'
  }

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="app-title text-2xl">Auditoría de Acciones</h2>
        <p className="text-sm text-gray-400 mt-1">Historial de acciones realizadas por los usuarios del sistema.</p>
      </div>

      {/* Filtros */}
      <div className="app-card p-5 mb-6">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Fecha inicio</label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Fecha fin</label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Módulo</label>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="input-base"
            >
              <option value="">Todos</option>
              <option value="Productos">Productos</option>
              <option value="Usuarios">Usuarios</option>
              <option value="Clientes">Clientes</option>
              <option value="Mermas">Mermas</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Usuario</label>
            <input
              type="text"
              placeholder="Buscar por usuario..."
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="input-base"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleBuscar} className="btn-primary">
            Buscar
          </button>
          <button onClick={handleLimpiar} className="btn-ghost">
            Limpiar
          </button>
          {!buscando && (
            <p className="text-xs text-gray-400 ml-2">Mostrando últimos 20 registros. Usa los filtros para ver más.</p>
          )}
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3.5 text-left font-semibold">Fecha y Hora</th>
              <th className="px-5 py-3.5 text-left font-semibold">Usuario</th>
              <th className="px-5 py-3.5 text-left font-semibold">Acción</th>
              <th className="px-5 py-3.5 text-left font-semibold">Módulo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-10 text-gray-400">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-10 text-gray-400">No hay registros de auditoría.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id_log} className="border-t border-gray-100 hover:bg-gray-50/60 transition">
                  <td className="px-5 py-3.5 text-xs text-gray-500">{formatFecha(log.fecha_hora)}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-700">{log.nombre_usuario}</td>
                  <td className="px-5 py-3.5 text-gray-600">{log.accion_realizada}</td>
                  <td className="px-5 py-3.5">
                    {log.tabla_afectada ? (
                      <span className={`badge ${colorModulo(log.tabla_afectada)}`}>{log.tabla_afectada}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
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

export default Auditoria