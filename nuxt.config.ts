// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    twitchClientId: '',
    twitchClientSecret: '',
    minecraftStatsDirectoryPath: '',
    minecraftAdvancementsDirectoryPath: '',
    minecraftOnlinePlayersFilePath: '',
    serverLogoFilePath: '',
    serverFaviconFilePath: '',
    twitchLiveStatusCacheTtlSeconds: 30,
    minecraftOnlineStatusCacheTtlSeconds: 15,
    minecraftStatsCacheTtlSeconds: 300,
    public: {
      serverName: 'Minecraft Server'
    }
  },

  routeRules: {
    '/statistiken': { redirect: '/statistiken/allgemein' }
  },

  compatibilityDate: '2026-06-30',

  vite: {
    plugins: [
      {
        // Brave repeatedly froze on hydration in dev from a corrupted V8 code cache entry (opening DevTools, which bypasses
        // that cache, made the page work). Chromium only reuses a code cache entry when the HTTP response time matches,
        // so no-store forces a fresh response on every load and the stale entry is never consumed.
        name: 'disable-browser-code-cache-in-dev',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((_request, response, next) => {
            const setHeader = response.setHeader.bind(response)
            response.setHeader = (name, value) =>
              setHeader(name, name.toLowerCase() === 'cache-control' ? 'no-store' : value)
            setHeader('Cache-Control', 'no-store')
            next()
          })
        }
      }
    ]
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
