import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
    
    // console.log('🛡️ ProtectedRoute:', { isAuthenticated, isLoading });
    
    if (isLoading) {
        // console.log('⏳ ProtectedRoute: Still loading auth, showing spinner');
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Lade...</p>
                </div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        // console.log('❌ ProtectedRoute: Not authenticated, need to redirect to tickets page');
        // Instead of using Navigate, use window.location to redirect properly
        const currentPath = window.location.pathname;
        const isEnglish = currentPath.startsWith('/en/');
        const ticketsPath = isEnglish ? '/en/shop' : '/de/shop';
        // console.log('🔄 ProtectedRoute: Redirecting to:', ticketsPath);
        window.location.href = ticketsPath;
        return null;
    }
    
    // console.log('✅ ProtectedRoute: User authenticated, rendering children');
    return <>{children}</>;
}
