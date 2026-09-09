import { useAuth } from './lib/AuthContext'
import Login from './components/Login'
import Journal from './components/Journal'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-neutral-950" />
  }

  return user ? <Journal /> : <Login />
}

export default App
