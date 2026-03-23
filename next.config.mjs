import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // OPTIMIZACIÓN: Habilitar compresión gzip (reduce 30-40% el tráfico)
  compress: true,
  
  // Headers para PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

// Configuración de PWA
const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false, // DESACTIVAR registro automático para evitar loops
  skipWaiting: false, 
  reloadOnOnline: false,
  // Workbox solo se aplica en build de producción
  ...(process.env.NODE_ENV === 'production' && {
    workboxOptions: {
      disableDevLogs: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 4,
              maxAgeSeconds: 365 * 24 * 60 * 60 // 1 año
            }
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: {
              maxEntries: 4,
              maxAgeSeconds: 7 * 24 * 60 * 60 // 1 semana
            }
          }
        },
        {
          urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-font-assets',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 7 * 24 * 60 * 60 // 1 semana
            }
          }
        },
        {
          urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-image-assets',
            expiration: {
              maxEntries: 64,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            }
          }
        },
        {
          urlPattern: /\/_next\/image\?url=.+$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'next-image',
            expiration: {
              maxEntries: 64,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            }
          }
        },
        {
          urlPattern: /\.(?:mp3|wav|ogg)$/i,
          handler: 'CacheFirst',
          options: {
            rangeRequests: true,
            cacheName: 'static-audio-assets',
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            }
          }
        },
        {
          urlPattern: /\.(?:mp4)$/i,
          handler: 'CacheFirst',
          options: {
            rangeRequests: true,
            cacheName: 'static-video-assets',
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            }
          }
        },
        {
          urlPattern: /\.(?:js)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-js-assets',
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            }
          }
        },
        {
          urlPattern: /\.(?:css|less)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-style-assets',
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            }
          }
        },
        {
          urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'next-data',
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            }
          }
        },
        {
          urlPattern: /\/api\/auth\/.*/i,
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'auth-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 30 * 24 * 60 * 60 // 30 días para persistencia PWA
            },
            networkTimeoutSeconds: 3
          }
        },
        {
          urlPattern: /\/api\/session-check.*/i,
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'session-cache',
            expiration: {
              maxEntries: 5,
              maxAgeSeconds: 7 * 24 * 60 * 60 // 1 semana
            },
            networkTimeoutSeconds: 2
          }
        },
        {
          urlPattern: /\/api\/(?!auth|session-check).*/i,
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'apis',
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            },
            networkTimeoutSeconds: 10 // Fallback a caché después de 10s
          }
        },
        {
          urlPattern: /.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'others',
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60 // 24 horas
            },
            networkTimeoutSeconds: 10
          }
        }
      ]
    }
  })
});

export default pwaConfig(nextConfig);
