// Utilidades para verificar y validar tokens JWT

import { auth, User } from './auth';
import { apiClient } from './api-client';

export interface TokenValidationResult {
  isValid: boolean;
  user: User | null;
  error?: string;
}

/**
 * Verifica si el token JWT es válido haciendo una petición al backend
 */
export async function validateToken(): Promise<TokenValidationResult> {
  const token = auth.getToken();
  const user = auth.getUser();

  if (!token || !user) {
    return {
      isValid: false,
      user: null,
      error: 'No hay token o usuario almacenado',
    };
  }

  try {
    // Hacemos una petición simple al backend para verificar que el token sea válido
    // Podríamos usar un endpoint específico como /auth/me, pero por ahora usamos /products
    // que requiere autenticación
    await apiClient.get('/products');
    
    return {
      isValid: true,
      user,
    };
  } catch (error: any) {
    // Si el token es inválido o expiró, limpiamos el localStorage
    if (error.statusCode === 401) {
      auth.logout();
      return {
        isValid: false,
        user: null,
        error: 'Token inválido o expirado',
      };
    }

    return {
      isValid: false,
      user: null,
      error: error.message || 'Error al validar el token',
    };
  }
}

/**
 * Obtiene la ruta de redirección según el rol del usuario
 */
export function getRedirectPathForUser(user: User | null): string {
  if (!user) {
    return '/login';
  }

  // Por ahora todos van a /admin, pero puedes personalizar según el rol
  if (user.role === 'ADMIN' || user.role === 'USER') {
    return '/admin';
  }

  return '/login';
}

