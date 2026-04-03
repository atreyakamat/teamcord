import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const ProductShell = lazy(() => import('./pages/ProductShell'))

function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#10292f] text-[#f6efe5]">Loading TeamCord...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<ProductShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
