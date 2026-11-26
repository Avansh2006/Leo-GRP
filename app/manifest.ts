import type { MetadataRoute } from 'next'

// Makes the toolkit installable (desktop + phone) as a standalone app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LEO Toolkit: Operations Center for RP Servers',
    short_name: 'LEO Toolkit',
    description: 'Bodycam commands, law guide, arrest workflow and duty reports for GTA RP officers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#131315',
    theme_color: '#131315',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Bodycam Commands', url: '/bodycam-commands' },
      { name: 'Law Guide', url: '/patrolman-guide' },
      { name: 'Reports', url: '/reports' },
    ],
  }
}
