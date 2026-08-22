import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import aiHandler from './api/ai.ts'

Object.assign(process.env, loadEnv('development', process.cwd(), ''));


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use('/api/ai', (req: any, res: any) => {
          // Mock Vercel res.status and res.json
          res.status = (statusCode: number) => {
            res.statusCode = statusCode;
            return res;
          };
          res.json = (data: any) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };

          let body = '';
          req.on('data', (chunk: any) => body += chunk.toString());
          req.on('end', () => {
            try {
              req.body = body ? JSON.parse(body) : {};
            } catch (e) {
              req.body = {};
            }
            aiHandler(req, res);
          });
        });
      }
    }
  ],
})
