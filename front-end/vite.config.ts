import type { ConfigEnv, UserConfig } from 'vite'
import https from 'node:https'
import { resolve } from 'node:path'
import Http2Proxy from '@admin-pkg/vite-plugin-http2-proxy'
import mockServerPlugin from '@admin-pkg/vite-plugin-msw/vite'
import TinymceResourcePlugin from '@admin-pkg/vite-plugin-tinymce-resource'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dayjs from 'dayjs'
import Unocss from 'unocss/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { loadEnv } from 'vite'
import checker from 'vite-plugin-checker'
import mkcert from 'vite-plugin-mkcert'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import VueDevTools from 'vite-plugin-vue-devtools'
import pkg from './package.json'

const CWD = process.cwd()

const __APP_INFO__ = {
  pkg,
  lastBuildTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
}

export default ({ command, mode }: ConfigEnv): UserConfig => {
  const { VITE_BASE_URL, VITE_DROP_CONSOLE, VITE_MOCK_IN_PROD } = loadEnv(mode, CWD)

  const isDev = command === 'serve'
  const isBuild = command === 'build'

  return {
    base: VITE_BASE_URL,
    define: {
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: resolve(__dirname, './src'),
        },
      ],
    },
    plugins: [
      vue(),
      VueDevTools(),
      Unocss(),
      vueJsx({}),
      mkcert({ source: 'coding' }),
      Http2Proxy(),
      TinymceResourcePlugin({ baseUrl: '/tinymce-resource/' }),
      createSvgIconsPlugin({
        iconDirs: [resolve(CWD, 'src/assets/icons')],
        symbolId: 'svg-icon-[dir]-[name]',
      }),
      Components({
        dts: 'types/components.d.ts',
        types: [
          {
            from: './src/components/basic/button/',
            names: ['AButton'],
          },
          {
            from: 'vue-router',
            names: ['RouterLink', 'RouterView'],
          },
        ],
        resolvers: [
          AntDesignVueResolver({
            importStyle: false,
            exclude: ['Button'],
          }),
        ],
      }),
    ],
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          modifyVars: {},
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 8088,
      open: true,
      proxy: {
        '^/api': {
          target: 'http://127.0.0.1:7001',
          secure: false,
          agent: new https.Agent(),
          changeOrigin: true,
        },
        '^/upload': {
          target: 'http://127.0.0.1:7001/upload',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/upload/, ''),
        },
      },
      warmup: {
        clientFiles: ['./index.html', './src/{components,api}/*'],
      },
    },
    optimizeDeps: {
      include: ['lodash-es', 'ant-design-vue/es/locale/zh_CN', 'ant-design-vue/es/locale/en_US'],
    },
    esbuild: {
      pure: VITE_DROP_CONSOLE === 'true' ? ['console.log'] : [],
      drop: VITE_DROP_CONSOLE === 'true' ? ['debugger'] : [],
      supported: {
        'top-level-await': true,
      },
    },
    build: {
      minify: 'esbuild',
      cssTarget: 'chrome108',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {},
        onwarn(warning, rollupWarn) {
          if (
            warning.code === 'CYCLIC_CROSS_CHUNK_REEXPORT'
            && warning.exporter?.includes('src/api/')
          ) {
            return
          }
          rollupWarn(warning)
        },
      },
    },
  }
}