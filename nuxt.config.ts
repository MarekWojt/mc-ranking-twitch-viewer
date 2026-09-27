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
    minecraftOnlinePlayersFilePath: '',
    twitchLiveStatusCacheTtlSeconds: 30,
    minecraftOnlineStatusCacheTtlSeconds: 15,
    minecraftStatsCacheTtlSeconds: 300,
    public: {
      serverName: 'Minecraft Server',
      serverLogoUrl: '/favicon.ico',
      serverFaviconUrl: '/favicon.ico'
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
