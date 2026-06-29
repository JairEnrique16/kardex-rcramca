import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState({
    razon_social: '',
    ruc: '',
    contacto_whatsapp: '',
    direccion: '',
  })

  useEffect(() => {
    cargarProveedores()
  }, [])

  async function cargarProveedores() {
    setLoading(true)
    const { data } = await supabase
      .from('proveedores')
      .select('*')
      .order('razon_social')
    setProveedores(data || [])
    setLoading(false)
  }

  async function handleGuardar() {
    if (!form.razon_social) {
      alert('La razón social es obligatoria')
      return
    }
    const { error } = await supabase.from('proveedores').insert({
      razon_social: form.razon_social,
      ruc: form.ruc,
      contacto_whatsapp: form.contacto_whatsapp,
      direccion: form.direccion,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowForm(false)
      setForm({ razon_social: '', ruc: '', contacto_whatsapp: '', direccion: '' })
      cargarProveedores()
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('proveedores').delete().eq('id_proveedor', id)
    cargarProveedores()
  }

  const proveedoresFiltrados = proveedores.filter(p =>
    p.razon_social.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Proveedores</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Agregar proveedor
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nuevo Proveedor</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Razón Social *</label>
              <input
                type="text"
                value={form.razon_social}
                onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">RUC</label>
              <input
                type="text"
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                maxLength={11}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">WhatsApp</label>
              <input
                type="text"
                value={form.contacto_whatsapp}
                onChange={(e) => setForm({ ...form, contacto_whatsapp: e.target.value })}
                placeholder="Ej: 999999999"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
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
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Razón Social</th>
              <th className="px-4 py-3 text-left">RUC</th>
              <th className="px-4 py-3 text-left">WhatsApp</th>
              <th className="px-4 py-3 text-left">Dirección</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : proveedoresFiltrados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">No hay proveedores registrados.</td></tr>
            ) : (
              proveedoresFiltrados.map(p => (
                <tr key={p.id_proveedor} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.razon_social}</td>
                  <td className="px-4 py-3">{p.ruc || '-'}</td>
                  <td className="px-4 py-3">
                    {p.contacto_whatsapp ? (
                      <a href={`https://wa.me/51${p.contacto_whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        {p.contacto_whatsapp} 📱
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">{p.direccion || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEliminar(p.id_proveedor)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Eliminar
                    </button>
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

export default Proveedores