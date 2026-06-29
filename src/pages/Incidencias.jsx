import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Incidencias() {
  const [incidencias, setIncidencias] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    id_movimiento: '',
    descripcion: '',
    gravedad: 'leve',
  })

  useEffect(() => {
    cargarIncidencias()
    cargarMovimientos()
  }, [])

  async function cargarIncidencias() {
    setLoading(true)
    const { data } = await supabase
      .from('incidencias_proveedor')
      .select('*, movimientos(tipo, fecha)')
      .order('id_incidencia', { ascending: false })
    setIncidencias(data || [])
    setLoading(false)
  }

  async function cargarMovimientos() {
    const { data } = await supabase
      .from('movimientos')
      .select('*')
      .eq('tipo', 'ingreso_proveedor')
      .order('fecha', { ascending: false })
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
              <select
                value={form.id_movimiento}
                onChange={(e) => setForm({ ...form, id_movimiento: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">Seleccionar ingreso</option>
                {movimientos.map(m => (
                  <option key={m.id_movimiento} value={m.id_movimiento}>
                    Ingreso #{m.id_movimiento} — {new Date(m.fecha).toLocaleDateString('es-PE')}
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
        </div>
      )}

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
                  <td className="px-4 py-3">Ingreso #{i.id_movimiento} — {i.movimientos ? formatFecha(i.movimientos.fecha) : '-'}</td>
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