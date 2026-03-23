'use client';
// hooks/useSessionPersistence.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para mantener sesiones persistentes en PWA
 * Usa AuthContext en lugar de next-auth
 */
export default function useSessionPersistence() {
  const { session, status, signOut, loading } = useAuth();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [persistentSession, setPersistentSession] = useState(null);

  const STORAGE_KEYS = {
    LAST_ACTIVITY: 'pwa-last-activity'
  };

  // Restaurar sesión desde localStorage (ya manejado por AuthContext)
  useEffect(() => {
    if (!loading) {
      setIsRestoringSession(false);
      if (session) {
        setPersistentSession(session);
      }
    }
  }, [session, loading]);

  // Actualizar última actividad
  const updateLastActivity = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
  }, [STORAGE_KEYS]);

  // Limpiar sesión persistente
  const clearPersistedSession = useCallback(async () => {
    await signOut({ redirect: false });
    setPersistentSession(null);

    // Limpiar localStorage adicional
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('pwa') || key.includes('session'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, [signOut]);

  // Actualizar actividad en interacciones
  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => updateLastActivity();

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateLastActivity]);

  return {
    session: persistentSession || session,
    isLoading: loading || isRestoringSession,
    isAuthenticated: !!(persistentSession || session),
    isPersistent: !!persistentSession,
    clearPersistedSession,
    updateLastActivity,
    status: persistentSession ? 'authenticated' : status
  };
}