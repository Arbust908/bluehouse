import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ["nuxt-charts", '@nuxtjs/color-mode'],
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
        },
      ],
      script: [
        {
          innerHTML: "try{const mode=localStorage.getItem('bluehouse-color-scheme');document.documentElement.classList.toggle('dark',mode==='dark'||(!mode&&matchMedia('(prefers-color-scheme: dark)').matches))}catch{}",
        },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: ''
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  css: ['~/assets/css/main.css'],
  nuxtCharts: {
    include: ['LineChart'],
    autoImports: false,
  }
})
