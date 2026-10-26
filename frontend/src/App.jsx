import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportHazard from './pages/ReportHazard';
import MyReports from './pages/MyReports';
import ReportDetails from './pages/ReportDetails';
import VerificationQueue from './pages/VerificationQueue';
import DuplicateReview from './pages/DuplicateReview';
import ReportAccident from './pages/ReportAccident';
import AccidentReview from './pages/AccidentReview';
import BudgetOptimization from './pages/BudgetOptimization';
import PriorityAnalysis from './pages/PriorityAnalysis';
import CityMap from './pages/CityMap';
import RepairWorkflow from './pages/RepairWorkflow';
import InspectorConsole from './pages/InspectorConsole';
import RewardsHub from './pages/RewardsHub';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-slate-50 to-green-50/40 text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report-hazard"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin', 'inspector']}>
                    <ReportHazard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report-accident"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin', 'inspector']}>
                    <ReportAccident />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-reports"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin', 'inspector']}>
                    <MyReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/:id"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin', 'inspector']}>
                    <ReportDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/verification"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <VerificationQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/duplicates"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <DuplicateReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/accidents"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <AccidentReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/optimization"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <BudgetOptimization />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/priority"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <PriorityAnalysis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin', 'inspector']}>
                    <CityMap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/repairs"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <RepairWorkflow />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/repairs/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <RepairWorkflow />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inspector/console"
                element={
                  <ProtectedRoute allowedRoles={['inspector', 'admin']}>
                    <InspectorConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rewards"
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'admin', 'inspector']}>
                    <RewardsHub />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="glass-panel border-t border-emerald-100 py-4 px-6 text-center text-xs text-slate-600">
            RoadWise AI • Municipal Road Repair Coordination Platform • Hackathon PS #13
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
