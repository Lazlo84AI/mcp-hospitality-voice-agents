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

// GET endpoint for health check / discovery
app.get('/mcp', (req: Request, res: Response) => {
  console.log('📍 GET /mcp - Health check');
  res.status(200).json({
    protocol: 'mcp',
    version: '2024-11-05',
    transport: 'http-post',
    status: 'ready',
    serverInfo: {
      name: 'mcp-hospitality',
      version: '3.0.0'
    }
  });
});

// MCP endpoint - POST (Tool invocation via JSON-RPC)
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    console.log('📬 Incoming MCP request from Dust');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
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

    // Gestion des méthodes MCP selon le protocole
    let result: any;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'mcp-hospitality',
            version: '3.0.0'
          }
        };
        break;

      case 'notifications/initialized':   // ← AJOUTE CE CASE ICI
        // Notification from client that initialization is complete
        console.log('📢 Received notifications/initialized from client');
        // Notifications don't require a response according to JSON-RPC 2.0
        res.status(200).send();
        return;

      case 'tools/list':
        result = {
          tools: [
            {
              name: 'test_supabase',
              description: 'Test Supabase database connection',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            },
            {
              name: 'get_all_staff',
              description: 'Retrieve all active staff members from HospitalityOS',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            },
            {
              name: 'get_all_locations',
              description: 'Retrieve all active locations (rooms, areas) from HospitalityOS',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            },
            {
              name: 'verify_staff_identity',
              description: 'Verify staff member identity by UUID',
              inputSchema: {
                type: 'object',
                properties: {
                  staff_id: { type: 'string', description: 'Staff UUID' }
                },
                required: ['staff_id']
              }
            },
            {
              name: 'verify_location',
              description: 'Verify location by UUID',
              inputSchema: {
                type: 'object',
                properties: {
                  location_id: { type: 'string', description: 'Location UUID' }
                },
                required: ['location_id']
              }
            },
            {
              name: 'ask_clarification',
              description: 'Ask for clarification via ElevenLabs voice',
              inputSchema: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  suggestions: { type: 'array', items: { type: 'string' } },
                  context: { type: 'string' },
                  conversation_id: { type: 'string' }
                },
                required: ['question', 'context', 'conversation_id']
              }
            },
            {
              name: 'create_task_report',
              description: 'Create a task report in HospitalityOS',
              inputSchema: {
                type: 'object',
                properties: {
                  staff_id: { type: 'string' },
                  location: { type: 'string' },
                  location_id: { type: 'string' },
                   assigned_to: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Array of staff UUIDs to assign the task to (from staff_directory)'
                    },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string', enum: ['client_request', 'incident', 'internal_task'] },
                  priority: { type: 'string', enum: ['normal', 'urgent'] },
                  guest_name: { type: 'string' },
                  voice_note_url: { type: 'string' },
                  voice_transcript: { type: 'string' },
                  conversation_id: { type: 'string' }
                },
                required: ['staff_id', 'location', 'title', 'description', 'category']
              }
            }
          ]
        };
        break;

      case 'tools/call':
        // Appel d'un outil spécifique
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32602,
              message: 'Invalid params: tool name is required'
            },
            id: id
          });
        }

        // Appel de la fonction correspondante dans mcpAgent
        let toolResult: any;
        
        switch (toolName) {
          case 'test_supabase':
            toolResult = await mcpAgent.testSupabase();
            break;
          case 'get_all_staff':
            toolResult = await mcpAgent.getAllStaff();
            break;
          case 'get_all_locations':
            toolResult = await mcpAgent.getAllLocations();
            break;
          case 'verify_staff_identity':
            toolResult = await mcpAgent.verifyStaff(toolArgs.staff_id);
            break;
          case 'verify_location':
            toolResult = await mcpAgent.verifyLocation(toolArgs.location_id);
            break;
          case 'ask_clarification':
            toolResult = await mcpAgent.askClarification(toolArgs);
            break;
          case 'create_task_report':
            toolResult = await mcpAgent.createTaskReport(toolArgs);
            break;
          default:
            return res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`
              },
              id: id
            });
        }

        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toolResult, null, 2)
            }
          ]
        };
        break;

      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
          id: id
        });
    }

    res.json({
      jsonrpc: '2.0',
      result: result,
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