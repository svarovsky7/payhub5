import React, {lazy, Suspense} from 'react'
import {Navigate, Route, Routes} from 'react-router-dom'
import {Spin} from 'antd'

import {MainLayout} from '../components/layout/main-layout'
import {useAuth} from '../models/auth'

// Lazy loading для оптимизации производительности
const LoginPage = lazy(() => import('../pages/Login'))
const DashboardPage = lazy(() => import('../pages/Dashboard'))
const InvoicesPage = lazy(() => import('../pages/Invoices'))
const InvoiceCreate = lazy(() => import('../pages/InvoiceCreate'))
const InvoiceView = lazy(() => import('../pages/InvoiceView'))
const PaymentsPage = lazy(() => import('../pages/Payments'))
const ApprovalsPage = lazy(() => import('../pages/Approvals/ApprovalsPage'))
const AdminPage = lazy(() => import('../pages/Admin'))
const NotFoundPage = lazy(() => import('../pages/not-found/not-found-page'))

const PageSuspense: React.FC<{ children: React.ReactNode }> = ({children}) => (
    <Suspense
        fallback={
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '50vh'
            }}>
                <Spin size="large"/>
            </div>
        }
    >
        {children}
    </Suspense>
)

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {user, isLoading} = useAuth()

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <Spin size="large"/>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace/>
    }

    return <>{children}</>
}

export const AppRouter: React.FC = () => {
    const {user} = useAuth()

    if (user) {
        return (
            <MainLayout>
                <PageSuspense>
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage/>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices"
                            element={
                                <ProtectedRoute>
                                    <InvoicesPage/>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/list"
                            element={
                                <ProtectedRoute>
                                    <InvoicesPage/>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/create"
                            element={
                                <ProtectedRoute>
                                    <InvoiceCreate/>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/invoices/:id"
                            element={
                                <ProtectedRoute>
                                    <InvoiceView/>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/payments"
                            element={
                                <ProtectedRoute>
                                    <PaymentsPage/>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/approvals"
                            element={
                                <ProtectedRoute>
                                    <ApprovalsPage/>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/*"
                            element={
                                <ProtectedRoute>
                                    <AdminPage/>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/login" element={<Navigate to="/dashboard" replace/>}/>
                        <Route path="*" element={<NotFoundPage/>}/>
                    </Routes>
                </PageSuspense>
            </MainLayout>
        )
    }

    return (
        <PageSuspense>
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="*" element={<Navigate to="/login" replace/>}/>
            </Routes>
        </PageSuspense>
    )
}