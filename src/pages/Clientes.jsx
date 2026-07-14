import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { registrarAuditoria } from '../utils/auditoria'
import { useAuth } from '../context/AuthContext'

function Clientes() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
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

    if (editando) {
      const { error } = await supabase.from('clientes').update({
        nombre_razon_social: form.nombre_razon_social,
        tipo: form.tipo,
        telefono: form.telefono,
      }).eq('id_cliente', editando)
      if (error) {
        alert('Error: ' + error.message)
        return
      }
      await registrarAuditoria(user?.id, 'Cliente editado: ' + form.nombre_razon_social, 'Clientes')
    } else {
      const { error } = await supabase.from('clientes').insert({
        nombre_razon_social: form.nombre_razon_social,
        tipo: form.tipo,
        telefono: form.telefono,
      })
      if (error) {
        alert('Error: ' + error.message)
        return
      }

      await registrarAuditoria(user?.id, 'Nuevo cliente registrado: ' + form.nombre_razon_social + ' (' + form.tipo + ')', 'Clientes')
    }

    setShowForm(false)
    setEditando(null)
    setForm({ nombre_razon_social: '', tipo: 'minorista', telefono: '' })
    cargarClientes()
  }

  function handleEditar(cliente) {
    setEditando(cliente.id_cliente)
    setForm({
      nombre_razon_social: cliente.nombre_razon_social,
      tipo: cliente.tipo,
      telefono: cliente.telefono || '',
    })
    setShowForm(true)
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clientes').delete().eq('id_cliente', id)
    await registrarAuditoria(user?.id, 'Cliente eliminado', 'Clientes')
    cargarClientes()
  }

  function iniciales(nombre) {
    return nombre
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase())
      .join('') || '?'
  }

  const clientesFiltrados = clientes.filter(c => {
    const cumpleNombre = c.nombre_razon_social.toLowerCase().includes(busqueda.toLowerCase())
    const cumpleTelefono = c.telefono?.includes(busqueda)
    const cumpleBusqueda = cumpleNombre || cumpleTelefono
    const cumpleTipo = filtroTipo ? c.tipo === filtroTipo : true
    return cumpleBusqueda && cumpleTipo
  })

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="app-title text-2xl">Clientes</h2>
          <p className="text-sm text-gray-400 mt-1">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditando(null); setForm({ nombre_razon_social: '', tipo: 'minorista', telefono: '' }) }}
          className="btn-success"
        >
          + Agregar cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-base flex-1"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="input-base w-48"
        >
          <option value="">Todos los tipos</option>
          <option value="minorista">Minorista</option>
          <option value="mayorista">Mayorista</option>
        </select>
      </div>

      {showForm && (
        <div className="app-card p-6 mb-6 border-brand-blue/20">
          <h3 className="app-title text-base mb-5">
            {editando ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre / Razón Social *</label>
              <input
                type="text"
                value={form.nombre_razon_social}
                onChange={(e) => setForm({ ...form, nombre_razon_social: e.target.value })}
                className="input-base"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo *</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="input-base"
              >
                <option value="minorista">Minorista</option>
                <option value="mayorista">Mayorista</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="input-base"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleGuardar} className="btn-primary">
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditando(null) }}
              className="btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="app-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3.5 text-left font-semibold">Cliente</th>
              <th className="px-5 py-3.5 text-left font-semibold">Tipo</th>
              <th className="px-5 py-3.5 text-left font-semibold">Teléfono</th>
              <th className="px-5 py-3.5 text-left font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-10 text-gray-400">Cargando...</td></tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-10 text-gray-400">No hay clientes registrados.</td></tr>
            ) : (
              clientesFiltrados.map(c => (
                <tr key={c.id_cliente} className="border-t border-gray-100 hover:bg-gray-50/60 transition">
                   <td className="px-5 py-3.5">
  <div className="flex items-center gap-3">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${c.tipo === 'mayorista' ? 'bg-brand-blue' : 'bg-brand-green-dark'}`}>
      {iniciales(c.nombre_razon_social)}
    </div>
    <div>
      <p className="font-medium text-gray-700">{c.nombre_razon_social}</p>
      <p className="text-xs text-gray-400">ID #{c.id_cliente}</p>
    </div>
  </div>
</td>
<td className="px-5 py-3.5">
  <span className={`badge ${c.tipo === 'mayorista' ? 'badge-solid-blue' : 'badge-solid-green'}`}>
    {c.tipo}
  </span>
</td>
                  <td className="px-5 py-3.5 text-gray-600">{c.telefono || '-'}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleEditar(c)}
                      className="text-brand-blue hover:text-brand-blue-dark text-xs font-medium mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(c.id_cliente)}
                      className="text-danger hover:text-danger-dark text-xs font-medium"
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