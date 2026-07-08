import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Incidencias() {
  const [incidencias, setIncidencias] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [form, setForm] = useState({
    id_movimiento: '',
    descripcion: '',
    gravedad: 'leve',
  })

  // Filtros
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroGravedad, setFiltroGravedad] = useState('')

  useEffect(() => {
    cargarIncidencias()
    
  }, [])

  useEffect(() => {
  
      cargarMovimientos()
    
  }, [showForm])

  async function cargarIncidencias(conFiltros = false) {
    setLoading(true)

    let query = supabase
      .from('incidencias_proveedor')
      .select('*, movimientos(tipo, fecha)')
      .order('id_incidencia', { ascending: false })

    if (filtroGravedad) query = query.eq('gravedad', filtroGravedad)
    if (!conFiltros) query = query.limit(20)

    const { data } = await query

    let resultado = data || []

    if (filtroFechaInicio) {
      resultado = resultado.filter(i => new Date(i.movimientos?.fecha) >= new Date(filtroFechaInicio))
    }
    if (filtroFechaFin) {
      resultado = resultado.filter(i => new Date(i.movimientos?.fecha) <= new Date(filtroFechaFin + 'T23:59:59'))
    }

    setIncidencias(resultado)
    setLoading(false)
  }

  async function cargarMovimientos() {
    const { data, error } = await supabase
      .from('movimientos')
      .select(`
        id_movimiento, tipo, fecha, observacion,
        proveedores(razon_social),
        detalle_movimientos(
          cantidad,
          productos(nombre),
          ubicaciones_destino:ubicaciones!detalle_movimientos_id_ubicacion_destino_fkey(nombre)
        )
      `)
      .eq('tipo', 'ingreso_proveedor')
      .order('id_movimiento', { ascending: false })
      .limit(50)

    if (error) console.error('Error:', error)
    setMovimientos(data || [])
  }

  async function handleGuardar() {
    if (!form.id_movimiento || !form.descripcion) {
      alert('Todos los campos son obligatorios')
      return
    }
    const { error } = await supabase.from('incidencias_proveedor').insert({
      id_movimiento: parseInt(form.id_movimiento),
      descripcion: form.descripcion,
      gravedad: form.gravedad,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowForm(false)
      setForm({ id_movimiento: '', descripcion: '', gravedad: 'leve' })
      cargarIncidencias()
    }
  }

  function handleBuscar() {
    setBuscando(true)
    cargarIncidencias(true)
  }

  function handleLimpiar() {
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    setFiltroGravedad('')
    setBuscando(false)
    cargarIncidencias(false)
  }

  function colorGravedad(gravedad) {
    if (gravedad === 'grave') return 'bg-red-100 text-red-700'
    if (gravedad === 'moderada') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  function formatFecha(fecha) {
    return new Date(fecha).toLocaleString('es-PE')
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Registro de Incidencias</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Registrar incidencia
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nueva Incidencia</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Ingreso de proveedor *</label>

              <div>
                 <button type="button" onClick={cargarMovimientos}
                   className="text-blue-500 text-xs hover:text-blue-700">
                 🔄 Actualizar lista
                </button>
              </div>

              
              <select
                value={form.id_movimiento}
                onChange={(e) => setForm({ ...form, id_movimiento: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
  
                <option value="">Seleccionar ingreso</option>
                {movimientos.map(m => (
                  <option key={m.id_movimiento} value={m.id_movimiento}>
                    #{m.id_movimiento} | {new Date(m.fecha).toLocaleDateString('es-PE')} | {m.proveedores?.razon_social || 'Sin proveedor'} | {m.detalle_movimientos?.[0]?.productos?.nombre || 'Sin producto'} | {m.detalle_movimientos?.[0]?.ubicaciones_destino?.nombre || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Gravedad *</label>
              <select
                value={form.gravedad}
                onChange={(e) => setForm({ ...form, gravedad: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="leve">Leve</option>
                <option value="moderada">Moderada</option>
                <option value="grave">Grave</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Descripción *</label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe el problema: productos dañados, faltantes, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                rows="3"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleGuardar}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                Guardar
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="grid grid-cols-4 gap-3 mb-3">
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
            <label className="text-xs text-gray-500">Gravedad</label>
            <select value={filtroGravedad} onChange={(e) => setFiltroGravedad(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">Todas</option>
              <option value="leve">Leve</option>
              <option value="moderada">Moderada</option>
              <option value="grave">Grave</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleBuscar}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
              Buscar
            </button>
            <button onClick={handleLimpiar}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">
              Limpiar
            </button>
          </div>
        </div>
        {!buscando && <p className="text-xs text-gray-400">Mostrando últimas 20 incidencias.</p>}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Ingreso relacionado</th>
              <th className="px-4 py-3 text-left">Gravedad</th>
              <th className="px-4 py-3 text-left">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : incidencias.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">No hay incidencias registradas.</td></tr>
            ) : (
              incidencias.map(i => (
                <tr key={i.id_incidencia} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{i.id_incidencia}</td>
                  <td className="px-4 py-3">
                    Ingreso #{i.id_movimiento} — {i.movimientos ? new Date(i.movimientos.fecha).toLocaleDateString('es-PE') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${colorGravedad(i.gravedad)}`}>
                      {i.gravedad}
                    </span>
                  </td>
                  <td className="px-4 py-3">{i.descripcion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Incidencias