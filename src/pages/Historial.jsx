import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Historial() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => {
    cargarHistorial()
  }, [])

  async function cargarHistorial() {
    setLoading(true)
    const { data } = await supabase
      .from('movimientos')
      .select(`
        *,
        detalle_movimientos(
          cantidad,
          id_ubicacion_origen,
          id_ubicacion_destino,
          productos(nombre)
        )
      `)
      .order('fecha', { ascending: false })

    if (data) {
      const movimientosConNombre = await Promise.all(data.map(async (m) => {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre')
          .eq('id', m.id_usuario)
          .single()
        return { ...m, nombre_usuario: perfil?.nombre || '-' }
      }))
      setMovimientos(movimientosConNombre)
    }
    setLoading(false)
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-PE',{ timeZone: 'America/Lima' })
  }

  function formatTipo(tipo) {
    const tipos = {
      ingreso_proveedor: 'Ingreso Proveedor',
      ingreso_produccion: 'Ingreso Producción',
      salida_venta: 'Salida Venta',
      traslado: 'Traslado',
    }
    return tipos[tipo] || tipo
  }

  function colorTipo(tipo) {
    if (tipo.includes('ingreso')) return 'bg-green-100 text-green-700'
    if (tipo.includes('salida')) return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  const movimientosFiltrados = movimientos.filter(m => {
    const cumpleFecha = filtroFecha ? m.fecha.startsWith(filtroFecha) : true
    const cumpleTipo = filtroTipo ? m.tipo === filtroTipo : true
    return cumpleFecha && cumpleTipo
  })

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Historial de Movimientos</h2>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-sm text-gray-600">Filtrar por fecha</label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Filtrar por tipo</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
          >
            <option value="">Todos</option>
            <option value="ingreso_proveedor">Ingreso Proveedor</option>
            <option value="ingreso_produccion">Ingreso Producción</option>
            <option value="salida_venta">Salida Venta</option>
            <option value="traslado">Traslado</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setFiltroFecha(''); setFiltroTipo('') }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
          >
            Limpiar filtros
          </button>
        </div>
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
            ) : movimientosFiltrados.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-400">No hay movimientos registrados.</td></tr>
            ) : (
              movimientosFiltrados.map(m => (
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
                  <td className="px-4 py-3">{m.nombre_usuario || '-'}</td>
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