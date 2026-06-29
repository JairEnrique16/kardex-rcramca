import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Auditoria() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarLogs()
  }, [])

  async function cargarLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('auditoria_logs')
      .select('*')
      .order('fecha_hora', { ascending: false })

    if (data) {
      const logsConUsuario = await Promise.all(data.map(async (log) => {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre')
          .eq('id', log.id_usuario)
          .single()
        return { ...log, nombre_usuario: perfil?.nombre || '-' }
      }))
      setLogs(logsConUsuario)
    }
    setLoading(false)
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-PE',{ timeZone: 'America/Lima' })
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Auditoría de Acciones</h2>

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