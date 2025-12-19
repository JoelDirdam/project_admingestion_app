/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3000',
  },
  // Mejorar el logging de errores en desarrollo
  onDemandEntries: {
    // Período en ms que una página se mantiene en el buffer
    maxInactiveAge: 25 * 1000,
    // Número de páginas que se deben mantener simultáneamente sin ser descartadas
    pagesBufferLength: 2,
  },
  // Configuración para desarrollo
  ...(process.env.NODE_ENV === 'development' && {
    // Mostrar más información en los errores
    logging: {
      fetches: {
        fullUrl: true,
      },
    },
  }),
}

module.exports = nextConfig


