import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Agenda } from './pages/Agenda'
import { Atletas } from './pages/Atletas'
import { AtletaPerfil } from './pages/AtletaPerfil'
import { Produtos } from './pages/Produtos'
import { Pagamentos } from './pages/Pagamentos'
import { Relatorios } from './pages/Relatorios'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agenda"
        element={
          <ProtectedRoute>
            <Agenda />
          </ProtectedRoute>
        }
      />
      <Route
        path="/atletas"
        element={
          <ProtectedRoute>
            <Atletas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/atletas/:id"
        element={
          <ProtectedRoute>
            <AtletaPerfil />
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <Produtos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pagamentos"
        element={
          <ProtectedRoute>
            <Pagamentos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <Relatorios />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
