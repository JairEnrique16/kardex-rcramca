import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Usuarios from './pages/Usuarios'
import Ingresos from './pages/Ingresos'
import Salidas from './pages/Salidas'
import Historial from './pages/Historial'
import ConsultaStock from './pages/ConsultaStock'
import Reportes from './pages/Reportes'
import Clientes from './pages/Clientes'
import Auditoria from './pages/Auditoria'
import ConsultaPrecios from './pages/ConsultaPrecios'
import Traslados from './pages/Traslados'
import Proveedores from './pages/Proveedores'
import Incidencias from './pages/Incidencias'
import Reclamos from './pages/Reclamos'
import Insumos from './pages/Insumos'
import Recetas from './pages/Recetas'
import OrdenesProduccion from './pages/OrdenesProduccion'
import Mermas from './pages/Mermas'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/productos" element={user ? <Productos /> : <Navigate to="/login" />} />
      <Route path="/usuarios" element={user ? <Usuarios /> : <Navigate to="/login" />} />
      <Route path="/ingresos" element={user ? <Ingresos /> : <Navigate to="/login" />} />
      <Route path="/salidas" element={user ? <Salidas /> : <Navigate to="/login" />} />
      <Route path="/historial" element={user ? <Historial /> : <Navigate to="/login" />} />
      <Route path="/consulta-stock" element={user ? <ConsultaStock /> : <Navigate to="/login" />} />
      <Route path="/reportes" element={user ? <Reportes /> : <Navigate to="/login" />} />
      <Route path="/clientes" element={user ? <Clientes /> : <Navigate to="/login" />} />
      <Route path="/auditoria" element={user ? <Auditoria /> : <Navigate to="/login" />} />
      <Route path="/precios" element={user ? <ConsultaPrecios /> : <Navigate to="/login" />} />
      <Route path="/traslados" element={user ? <Traslados /> : <Navigate to="/login" />} />
      <Route path="/proveedores" element={user ? <Proveedores /> : <Navigate to="/login" />} />
      <Route path="/incidencias" element={user ? <Incidencias /> : <Navigate to="/login" />} />
      <Route path="/reclamos" element={user ? <Reclamos /> : <Navigate to="/login" />} />
      <Route path="/insumos" element={user ? <Insumos /> : <Navigate to="/login" />} />
      <Route path="/recetas" element={user ? <Recetas /> : <Navigate to="/login" />} />
      <Route path="/ordenes-produccion" element={user ? <OrdenesProduccion /> : <Navigate to="/login" />} />
      <Route path="/mermas" element={user ? <Mermas /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App