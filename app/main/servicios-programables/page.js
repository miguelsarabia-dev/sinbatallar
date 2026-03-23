"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ServiciosProgramablesNuevo from '../../../components/view/main/ServiciosProgramablesNuevo';
import Header from '@/components/view/main/Header';

export default function ServiciosProgramablesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/login');
            return;
        }

        setLoading(false);
    }, [session, status, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <>
            <Header />
            <ServiciosProgramablesNuevo />
        </>
    );
}
