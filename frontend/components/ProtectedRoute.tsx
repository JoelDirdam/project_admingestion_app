'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { validateToken } from '@/lib/auth-utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = auth.getToken();
      const user = auth.getUser();

      // Si no hay token o usuario, redirigir a login
      if (!token || !user) {
        router.push('/login');
        return;
      }

      // Validar el token con el backend
      try {
        const validation = await validateToken();

        if (!validation.isValid) {
          // Token inválido, limpiar y redirigir
          auth.logout();
          router.push('/login');
          return;
        }

        // Si requiere admin, verificar el rol
        if (requireAdmin && !auth.isAdmin()) {
          router.push('/admin');
          return;
        }

        // Todo está bien, mostrar el contenido
        setIsLoading(false);
      } catch (error) {
        console.error('Error al validar sesión:', error);
        auth.logout();
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, requireAdmin]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

