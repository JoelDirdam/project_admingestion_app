'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { validateToken, getRedirectPathForUser } from '@/lib/auth-utils';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Verificar si hay token y usuario en localStorage
        const token = auth.getToken();
        const user = auth.getUser();

        if (!token || !user) {
          // No hay sesión, redirigir a login
          router.push('/login');
          return;
        }

        // Validar el token con el backend
        const validation = await validateToken();

        if (validation.isValid && validation.user) {
          // Token válido, redirigir a la pantalla correspondiente
          const redirectPath = getRedirectPathForUser(validation.user);
          router.push(redirectPath);
        } else {
          // Token inválido o expirado, limpiar y redirigir a login
          auth.logout();
          router.push('/login');
        }
      } catch (error) {
        // Error al validar, redirigir a login
        console.error('Error al validar sesión:', error);
        auth.logout();
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Este contenido no debería mostrarse ya que siempre redirige
  return null;
}
