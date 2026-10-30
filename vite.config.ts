import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Tylko w trybie dev: projekt z przeglądarki zapisywany też na dysk (projekt-roboczy.json), żeby dało się go czytać i poprawiać poza przeglądarką. */
function projectFile(): Plugin {
  const file = resolve(__dirname, 'projekt-roboczy.json')
  return {
    name: 'project-file',
    configureServer(server) {
      server.middlewares.use('/api/project', (req, res) => {
        if (req.method === 'GET') {
          if (!existsSync(file)) {
            res.statusCode = 404
            res.end()
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(readFileSync(file, 'utf8'))
          return
        }
        if (req.method === 'PUT') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            try {
              JSON.parse(body)
              writeFileSync(file, body)
              res.statusCode = 204
            } catch {
              res.statusCode = 400
            }
            res.end()
          })
          return
        }
        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), projectFile()],
  server: { port: 5181 },
})
