import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Reclamos() {
  const [reclamos, setReclamos] = useState([])
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    id_venta: '',
    motivo: '',
    descripcion: '',
    estado: 'abierto',
  })

  useEffect(() => {
    cargarReclamos()
    cargarVentas()
  }, [])

  async function cargarReclamos() {
    setLoading(true)
    const { data } = await supabase
      .from('registro_reclamos')
      .select('*, ventas_cabecera(id_venta, fecha)')
      .order('id_reclamo', { ascending: false })
    setReclamos(data || [])
    setLoading(false)
  }

  async function cargarVentas() {
    const { data } = await supabase
      .from('ventas_cabecera')
      .select('*')
      .order('fecha', { ascending: false })
    setVentas(data || [])
  }

  async function handleGuardar() {
    if (!form.id_venta || !form.motivo) {
      alert('Venta y motivo son obligatorios')
      return
    }
    const { error } = await supabase.from('registro_reclamos').insert({
      id_venta: parseInt(form.id_venta),
      motivo: form.motivo,
      descripcion: form.descripcion,
      estado: form.estado,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowForm(false)
      setForm({ id_venta: '', motivo: '', descripcion: '', estado: 'abierto' })
      cargarReclamos()
    }
  }

  async function handleCambiarEstado(id, estado) {
    await supabase.from('registro_reclamos').update({ estado }).eq('id_reclamo', id)
    cargarReclamos()
  }

  function colorEstado(estado) {
    if (estado === 'cerrado') return 'bg-green-100 text-green-700'
    if (estado === 'en_proceso') return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Reclamos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Registrar reclamo
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nuevo Reclamo</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Venta relacionada *</label>
              <select
                value={form.id_venta}
                onChange={(e) => setForm({ ...form, id_venta: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">Seleccionar venta</option>
                {ventas.map(v => (
                  <option key={v.id_venta} value={v.id_venta}>
                    Venta #{v.id_venta} — {new Date(v.fecha).toLocaleDateString('es-PE')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Motivo *</label>
              <input
                type="text"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej: Producto dañado, entrega incorrecta"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
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
              <th className="px-4 py-3 text-left">Venta</th>
              <th className="px-4 py-3 text-left">Motivo</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : reclamos.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">No hay reclamos registrados.</td></tr>
            ) : (
              reclamos.map(r => (
                <tr key={r.id_reclamo} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{r.id_reclamo}</td>
                  <td className="px-4 py-3">Venta #{r.id_venta}</td>
                  <td className="px-4 py-3">{r.motivo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.descripcion || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${colorEstado(r.estado)}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.estado === 'abierto' && (
                      <button
                        onClick={() => handleCambiarEstado(r.id_reclamo, 'en_proceso')}
                        className="text-yellow-600 hover:text-yellow-800 text-xs mr-2"
                      >
                        En proceso
                      </button>
                    )}
                    {r.estado === 'en_proceso' && (
                      <button
                        onClick={() => handleCambiarEstado(r.id_reclamo, 'cerrado')}
                        className="text-green-600 hover:text-green-800 text-xs"
                      >
                        Cerrar
                      </button>
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

export default Reclamos