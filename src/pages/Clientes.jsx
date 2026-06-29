import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { registrarAuditoria } from '../utils/auditoria'
import { useAuth } from '../context/AuthContext'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { user } = useAuth()
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState({
    nombre_razon_social: '',
    tipo: 'minorista',
    telefono: '',
  })

  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre_razon_social')
    setClientes(data || [])
    setLoading(false)
  }

  async function handleGuardar() {
    if (!form.nombre_razon_social) {
      alert('El nombre es obligatorio')
      return
    }
    const { error } = await supabase.from('clientes').insert({
      nombre_razon_social: form.nombre_razon_social,
      tipo: form.tipo,
      telefono: form.telefono,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      await registrarAuditoria(user?.id, 'Nuevo cliente registrado: ' + form.nombre_razon_social + ' (' + form.tipo + ')', 'Clientes')
      setShowForm(false)
      setForm({ nombre_razon_social: '', tipo: 'minorista', telefono: '' })
      cargarClientes()
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clientes').delete().eq('id_cliente', id)
    await registrarAuditoria(user?.id, 'Cliente eliminado', 'Clientes')
    cargarClientes()
  }
  const clientesFiltrados = clientes.filter(c =>
    c.nombre_razon_social.toLowerCase().includes(busqueda.toLowerCase())
  )
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Clientes</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Agregar cliente
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar cliente por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nuevo Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Nombre / Razón Social *</label>
              <input
                type="text"
                value={form.nombre_razon_social}
                onChange={(e) => setForm({ ...form, nombre_razon_social: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Tipo *</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="minorista">Minorista</option>
                <option value="mayorista">Mayorista</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
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
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nombre / Razón Social</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">No hay clientes registrados.</td></tr>
            ) : (
              clientesFiltrados.map(c => (
                <tr key={c.id_cliente} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{c.id_cliente}</td>
                  <td className="px-4 py-3 font-medium">{c.nombre_razon_social}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${c.tipo === 'mayorista' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.telefono || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEliminar(c.id_cliente)}
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

export default Clientes