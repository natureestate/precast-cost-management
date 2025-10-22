import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Env } from './types';

// Import routes
import products from './routes/products';
import projects from './routes/projects';
import costs from './routes/costs';
import upload from './routes/upload';
import query from './routes/query';
import analytics from './routes/analytics';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    service: 'Precast Cost Management System',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route('/api/products', products);
app.route('/api/projects', projects);
app.route('/api/costs', costs);
app.route('/api/documents', upload);
app.route('/api/query', query);
app.route('/api/analytics', analytics);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not Found',
      code: 'NOT_FOUND',
      path: c.req.path,
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    {
      success: false,
      error: err.message || 'Internal Server Error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString(),
    },
    500
  );
});

export default app;
