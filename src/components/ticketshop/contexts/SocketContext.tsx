import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SessionManager } from '../utils/session';
import { WS_URL } from '../../../environment';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    reconnect: () => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { isAuthenticated, customer, isLoading: authLoading } = useAuth();

    const createSocketConnection = () => {
        // Don't create socket while auth is still loading
        if (authLoading) {
            return;
        }

        const wsUrl = WS_URL;
        const sessionId = SessionManager.getSessionId();

        const newSocket = io(wsUrl, {
            auth: {
                clientId: '00000000-0000-0000-0000-000000000001', // Same as API client ID
                sessionId: sessionId,
                // userId: isAuthenticated && customer ? customer.id : null,
            },
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            // console.log('Connected to reservation system');
            setIsConnected(true);

            // Join user-specific room for personal notifications if authenticated
            // if (isAuthenticated && customer) {
            //     console.log('🔌 SocketProvider: Joining user room for user:', customer.id);
            //     newSocket.emit('join-user-room', { userId: customer.id });
            // } else {
            // console.log('🔌 SocketProvider: Joining session room for session:', sessionId);
            // Always join session room for reservation updates
            newSocket.emit('join-user-room', { sessionId });
            // }

        });

        newSocket.on('disconnect', (reason) => {
            // console.log('Disconnected from reservation system:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        });

        setSocket(newSocket);
        return newSocket;
    };

    const disconnect = () => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
    };

    const reconnect = () => {
        disconnect();
        createSocketConnection();
    };

    // Initialize socket connection when auth loading is complete
    useEffect(() => {
        if (!authLoading) {
            const newSocket = createSocketConnection();

            return () => {
                if (newSocket) {
                    newSocket.disconnect();
                }
            };
        }
    }, [authLoading, isAuthenticated, customer?.id]);

    // Reconnect when auth state changes (login/logout)
    useEffect(() => {
        if (!authLoading && socket) {
            // Emit updated user info to existing socket
            if (isAuthenticated && customer) {
                socket.emit('update-user-info', {
                    userId: customer.id,
                    userEmail: customer.email
                });
                socket.emit('join-user-room', { userId: customer.id });
            } else {
                socket.emit('leave-user-room');
            }
        }
    }, [isAuthenticated, customer?.id, socket, authLoading]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, []);

    const value: SocketContextType = {
        socket,
        isConnected,
        reconnect,
        disconnect,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}