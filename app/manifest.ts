import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'FeedTrack Baby Tracker',
    short_name: 'FeedTrack',
    description: 'A private baby tracker for feeds, nappies, pumping, and daily patterns.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    categories: ['health', 'lifestyle', 'productivity'],
    lang: 'en-GB',
    dir: 'ltr',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/favicon/favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Log feed',
        short_name: 'Feed',
        description: 'Open the tracker to log a feed.',
        url: '/?source=pwa-shortcut-feed',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Log nappy',
        short_name: 'Nappy',
        description: 'Open the tracker to log a nappy.',
        url: '/?source=pwa-shortcut-nappy',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Analytics',
        short_name: 'Stats',
        description: 'View recent feed and nappy patterns.',
        url: '/analytics?range=1d',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'History',
        short_name: 'History',
        description: 'Review recent logged activity.',
        url: '/history',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }
}
