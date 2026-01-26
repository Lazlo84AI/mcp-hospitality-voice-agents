// ========================================
// MCP HOSPITALITY SERVER - RENDER ENTRY POINT
// ========================================
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { HospitalityMCP } from './agent.js';

// ========================================
// ENVIRONMENT VALIDATION
// ========================================
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

function validateEnvironment(): void {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }
  
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
    console.warn('⚠️  Warning: ElevenLabs credentials not set (voice notifications will be disabled)');
  }
  
  console.log('✅ All required environment variables are set');
}

validateEnvironment();

// ========================================
// MCP AGENT INITIALIZATION
// ========================================
console.log('🔧 Initializing MCP Agent...');

const mcpAgent = new HospitalityMCP({
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID
});

await mcpAgent.init();
console.log('✅ MCP Agent initialized with 7 tools');

// ========================================
// EXPRESS APP INITIALIZATION
// ========================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS Configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['https://dust.tt', 'https://front.dust.tt', '*'];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  credentials: true
}));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ========================================
// ROUTES
// ========================================

// Root endpoint - Server info
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'mcp-hospitality',
    version: '3.0.0',
    description: 'Voice Activity Reports for HospitalityOS',
    runtime: 'Render.com + Node.js',
    endpoints: {
      root: '/',
      health: '/health',
      mcp: '/mcp (POST - tool invocation)'
    },
    tools: [
      'test_supabase',
      'get_all_staff',
      'get_all_locations',
      'verify_staff_identity',
      'verify_location',
      'ask_clarification',
      'create_task_report'
    ],
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = mcpAgent && mcpAgent.server;

    if (!isHealthy) {
      throw new Error('MCP Agent not initialized');
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      service: 'mcp-hospitality-server',
      mcp_agent: 'connected',
      tools_count: 7,
      environment: process.env.NODE_ENV || 'production'
    });

  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      mcp_agent: 'disconnected'
    });
  }
});

// MCP endpoint - POST (Tool invocation via JSON-RPC)
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    console.log('📬 Incoming MCP request from Dust');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    // Dust envoie des requêtes au format JSON-RPC 2.0
    const { method, params, id } = req.body;
    
    if (!method) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: method is required'
        },
        id: id || null
      });
    }

    // Pour l'instant, on retourne une réponse basique
    // L'intégration complète avec le MCP server viendra ensuite
    res.json({
      jsonrpc: '2.0',
      result: {
        status: 'received',
        method: method,
        params: params,
        message: 'MCP endpoint is operational, full integration pending'
      },
      id: id
    });
    
    console.log('✅ MCP request processed');
    
  } catch (error: any) {
    console.error('❌ MCP endpoint error:', error.message);
    
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      id: req.body.id || null
    });
  }
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    available_endpoints: ['/', '/health', '/mcp'],
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log('\n🚀 ==========================================');
  console.log('✅ MCP HOSPITALITY SERVER STARTED');
  console.log('==========================================');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🛠️  MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log('==========================================\n');
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
const shutdown = async (signal: string) => {
  console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});