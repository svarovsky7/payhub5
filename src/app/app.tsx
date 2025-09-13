import React from 'react'
import {App as AntApp} from 'antd'
import ruRU from 'antd/locale/ru_RU'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query/devtools'
import {BrowserRouter} from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

import {AppRouter} from './router'
import {AuthProvider} from '../models/auth'
import {ThemeProvider} from '../components/theme/ThemeProvider'
import '../styles/globals.css'
import '../styles/theme.css'

// Настройка dayjs на русский язык
dayjs.locale('ru')

// Theme configuration is now handled by ThemeProvider

// Настройка React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 минут
            gcTime: 10 * 60 * 1000, // 10 минут (ранее cacheTime)
            refetchOnWindowFocus: false,
            retry: (failureCount, _error) => {
                if (error instanceof Error && error.message.includes('401')) {
                    return false
                }
                return failureCount < 3
            },
        },
        mutations: {
            retry: false,
        },
    },
})

export const App: React.FC = () => {
    return (
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <ThemeProvider locale={ruRU}>
                        <AntApp>
                            <AppRouter/>
                            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false}/>}
                        </AntApp>
                    </ThemeProvider>
                </AuthProvider>
            </QueryClientProvider>
        </BrowserRouter>
    )
}