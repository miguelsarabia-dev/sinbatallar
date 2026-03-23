'use client';
// contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

// Referencia global para signOut (para uso sin hook)
let globalSignOut = null;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Cargar usuario de localStorage al iniciar
    useEffect(() => {
        const loadUser = () => {
            try {
                const token = localStorage.getItem('auth-token');
                const userData = localStorage.getItem('auth-user');

                if (token && userData) {
                    setUser(JSON.parse(userData));
                    document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
                }
            } catch (error) {
                console.error('Error cargando sesión:', error);
                localStorage.removeItem('auth-token');
                localStorage.removeItem('auth-user');
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    // Función de login
    const signIn = useCallback(async (credentials) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return { error: data.message || 'Error de autenticación' };
            }

            localStorage.setItem('auth-token', data.token);
            localStorage.setItem('auth-user', JSON.stringify(data.user));
            document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;

            setUser(data.user);

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Error en login:', error);
            return { error: 'Error de conexión' };
        }
    }, []);

    // Función de login con Google
    const signInWithGoogle = useCallback(async (credential) => {
        try {
            const response = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return { error: data.message || 'Error al autenticar con Google' };
            }

            localStorage.setItem('auth-token', data.token);
            localStorage.setItem('auth-user', JSON.stringify(data.user));
            document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;

            setUser(data.user);

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Error en login con Google:', error);
            return { error: 'Error de conexión' };
        }
    }, []);

    // Función de logout
    const handleSignOut = useCallback(async (options = {}) => {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setUser(null);

        const redirectUrl = options.callbackUrl || '/login';
        if (options.redirect !== false) {
            window.location.href = redirectUrl;
        }
    }, []);

    // Establecer referencia global
    useEffect(() => {
        globalSignOut = handleSignOut;
    }, [handleSignOut]);

    // Obtener token
    const getToken = useCallback(() => {
        return localStorage.getItem('auth-token');
    }, []);

    // Session compatible con next-auth
    const session = user ? {
        user,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    } : null;

    const value = {
        user,
        session,
        loading,
        signIn,
        signInWithGoogle,
        signOut: handleSignOut,
        getToken,
        status: loading ? 'loading' : user ? 'authenticated' : 'unauthenticated'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook principal
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
}

// Hook compatible con next-auth useSession
export function useSession() {
    const { session, status } = useAuth();
    return {
        data: session,
        status,
        update: () => { }
    };
}

// Función signOut exportable (para compatibilidad con imports directos)
export async function signOut(options = {}) {
    if (globalSignOut) {
        return globalSignOut(options);
    }
    // Fallback si no hay provider
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = options.callbackUrl || '/login';
}

// Función signIn exportable (requiere credenciales)
export async function signInDirect(credentials) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            return { error: data.message || 'Error de autenticación' };
        }

        localStorage.setItem('auth-token', data.token);
        localStorage.setItem('auth-user', JSON.stringify(data.user));
        document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;

        return { success: true, user: data.user };
    } catch (error) {
        return { error: 'Error de conexión' };
    }
}

export { AuthContext };
