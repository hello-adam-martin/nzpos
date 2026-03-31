import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NZPOS',
    short_name: 'NZPOS',
    description: 'NZ Retail POS System',
    start_url: '/pos',
    display: 'standalone',
    background_color: '#1E293B',
    theme_color: '#1E293B',
    orientation: 'any',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
