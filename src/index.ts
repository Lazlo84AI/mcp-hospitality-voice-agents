import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import { z } from 'zod';

export class HospitalityMCP {
  env: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    ELEVENLABS_API_KEY?: string;
    ELEVENLABS_AGENT_ID?: string;
  };
  server: McpServer; 
  constructor(env: any) {
    this.env = env;
    this.server = new McpServer({
    name: "mcp-hospitality",
    version: "3.0.0",
    description: "MCP Server for HospitalityOS Voice Activity Reports"
  });
}

  // ========================================
// FONCTION : Envoyer un message à ElevenLabs via API REST HTTP
// ========================================
private async sendToElevenLabs(
  message: string, 
  conversationId: string,
  apiKey: string, 
  agentId: string
): Promise<boolean> {
  try {
    console.log(`📤 Sending message to ElevenLabs (conversation: ${conversationId})...`);

    // ✅ API REST ElevenLabs (pas WebSocket !)
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/send_message`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          conversation_id: conversationId,
          message: message
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ ElevenLabs API error:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("✅ Message sent to ElevenLabs:", result);
    return true;

  } catch (err: any) {
    console.error("❌ Failed to send to ElevenLabs:", err.message);
    return false;
  }
}

async init() {
    // 🔹 Initialisation Supabase
    const supabase = createClient(
      this.env.SUPABASE_URL,
      this.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("✅ Supabase initialized for HospitalityOS");

    // 🔹 Enregistrement des 7 outils
    this.registerTestTool(supabase);
    this.registerGetAllStaffTool(supabase);
    this.registerGetAllLocationsTool(supabase);
    this.registerVerifyStaffTool(supabase);
    this.registerVerifyLocationTool(supabase);
    this.registerAskClarificationTool(supabase);
    this.registerCreateTaskReportTool(supabase);

    console.log("✅ 7 tools registered successfully");
  }
  
  // ========================================
  // OUTIL 1 : Test Supabase Connection
  // ========================================
  private registerTestTool(supabase: any) {
    this.server.tool(
      "test_supabase",
      "Test de connexion Supabase depuis le Worker Cloudflare",
      {},
      async () => {
        try {
          console.log("🧪 Testing Supabase connection...");

          const { data, error } = await supabase
            .from("staff_directory")
            .select("id, full_name, role")
            .eq("is_active", true)
            .limit(1);

          if (error) {
            console.error("❌ Supabase test failed:", error.message);
            return {
              content: [{
                type: "text",
                text: `❌ Erreur Supabase: ${error.message}`
              }],
              isError: true
            };
          }

          console.log("✅ Supabase test successful");
          return {
            content: [{
              type: "text",
              text: `✅ Connexion Supabase OK! Found ${data?.length || 0} active staff member(s)`
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err.message);
          return {
            content: [{
              type: "text",
              text: `❌ Erreur inattendue: ${err.message}`
            }],
            isError: true
          };
        }
      }
    );
  }

  // ========================================
  // OUTIL 2 : Lister tout le staff
  // ========================================
  private registerGetAllStaffTool(supabase: any) {
    this.server.tool(
      "get_all_staff",
      "Récupère la liste COMPLÈTE de tous les membres du staff actifs",
      {},
      async () => {
        try {
          console.log("📋 Fetching all active staff...");

          const { data, error } = await supabase
            .from("staff_directory")
            .select("id, full_name, first_name, last_name, role, department, service, job_title")
            .eq("is_active", true)
            .order("full_name", { ascending: true });

          if (error) {
            console.error("❌ Supabase error:", error.message);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  message: error.message
                })
              }],
              isError: true
            };
          }

          console.log(`✅ Found ${data.length} active staff members`);

          const formattedStaff = data.map((staff: any) => ({
            id: staff.id,
            name: `${staff.first_name} ${staff.last_name}`,
            first_name: staff.first_name,
            last_name: staff.last_name,
            role: staff.job_title || staff.role,
            service: staff.service || staff.department
          }));

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                total_count: data.length,
                staff: formattedStaff
              }, null, 2)
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err.message);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: err.message
              })
            }],
            isError: true
          };
        }
      }
    );
  }

  // ========================================
  // OUTIL 3 : Lister toutes les localisations
  // ========================================
  private registerGetAllLocationsTool(supabase: any) {
    this.server.tool(
      "get_all_locations",
      "Récupère la liste COMPLÈTE de toutes les localisations actives de l'hôtel",
      {},
      async () => {
        try {
          console.log("📋 Fetching all active locations...");

          const { data, error } = await supabase
            .from("locations")
            .select("id, name, display_name, location_code, floor, type, location_type, building")
            .eq("is_active", true)
            .order("floor", { ascending: true })
            .order("name", { ascending: true });

          if (error) {
            console.error("❌ Supabase error:", error.message);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  message: error.message
                })
              }],
              isError: true
            };
          }

          console.log(`✅ Found ${data.length} active locations`);

          const formattedLocations = data.map((loc: any) => ({
            id: loc.id,
            name: loc.display_name || loc.name,
            location_code: loc.location_code,
            floor: loc.floor,
            type: loc.location_type || loc.type
          }));

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                total_count: data.length,
                locations: formattedLocations
              }, null, 2)
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err.message);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: err.message
              })
            }],
            isError: true
          };
        }
      }
    );
  }

  // ========================================
  // OUTIL 4 : Vérifier l'identité du staff (par UUID uniquement)
  // ========================================
  private registerVerifyStaffTool(supabase: any) {
    this.server.tool(
      "verify_staff_identity",
      "Récupère les détails complets d'un membre du staff par son UUID",
      {
        staff_id: z.string().describe("UUID du membre du staff")
      },
      async (params) => {
        try {
          console.log("🔍 Verifying staff by UUID:", params.staff_id);

          const { data, error } = await supabase
            .from("staff_directory")
            .select("id, full_name, first_name, last_name, email, role, department, service, job_title, hierarchy")
            .eq("id", params.staff_id)
            .eq("is_active", true)
            .single();

          if (error || !data) {
            console.error("❌ Staff not found:", params.staff_id);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  error: `Aucun membre du staff actif trouvé avec l'ID: ${params.staff_id}` 
                })
              }],
              isError: true
            };
          }

          console.log("✅ Staff verified:", `${data.first_name} ${data.last_name}`);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                staff_verified: true,
                staff_id: data.id,
                staff_name: `${data.first_name} ${data.last_name}`,
                first_name: data.first_name,
                last_name: data.last_name,
                staff_role: data.job_title || data.role,
                staff_department: data.service || data.department,
                email: data.email
              })
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err.message);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: err.message })
            }],
            isError: true
          };
        }
      }
    );
  }

  // ========================================
  // OUTIL 5 : Vérifier la localisation (par UUID uniquement)
  // ========================================
  private registerVerifyLocationTool(supabase: any) {
    this.server.tool(
      "verify_location",
      "Récupère les détails complets d'une localisation par son UUID",
      {
        location_id: z.string().describe("UUID de la localisation")
      },
      async (params) => {
        try {
          console.log("📍 Verifying location by UUID:", params.location_id);

          const { data, error } = await supabase
            .from("locations")
            .select("id, name, display_name, location_code, type, location_type, floor, building, capacity, metadata")
            .eq("id", params.location_id)
            .eq("is_active", true)
            .single();

          if (error || !data) {
            console.error("❌ Location not found:", params.location_id);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  error: `Aucune localisation active trouvée avec l'ID: ${params.location_id}` 
                })
              }],
              isError: true
            };
          }

          console.log("✅ Location verified:", data.display_name || data.name);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                location_verified: true,
                location_id: data.id,
                location_name: data.display_name || data.name,
                location_code: data.location_code,
                floor: data.floor,
                location_type: data.location_type || data.type,
                building: data.building
              })
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err.message);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: err.message })
            }],
            isError: true
          };
        }
      }
    );
  }

  // ========================================
  // OUTIL 6 : Demander une clarification + HTTP ElevenLabs
  // ========================================
  private registerAskClarificationTool(supabase: any) {
    this.server.tool(
      "ask_clarification",
      "Demande une clarification à l'utilisateur via ElevenLabs quand l'information est ambiguë ou manquante",
      {
        question: z.string().describe("Question à poser à l'utilisateur"),
        suggestions: z.array(z.string()).optional().describe("Liste optionnelle de suggestions"),
        context: z.enum(["staff_identity", "location", "task_details", "priority", "other"]).describe("Type de clarification demandée"),
        conversation_id: z.string().describe("ID de conversation ElevenLabs (pour traçabilité)")
      },
      async (params) => {
        try {
          console.log("❓ Asking for clarification:", params.context);

          const { question, suggestions = [], conversation_id } = params;

          // Format la réponse pour ElevenLabs
          let formatted_response = question;
          
          if (suggestions.length > 0) {
            formatted_response += ` Options : ${suggestions.join(' ou ')}.`;
          }

          // ========================================
          // ENVOI À ELEVENLABS VIA API REST HTTP
          // ========================================
          let elevenlabs_notified = false;
          if (this.env.ELEVENLABS_API_KEY && this.env.ELEVENLABS_AGENT_ID) {
            try {
              elevenlabs_notified = await this.sendToElevenLabs(
                formatted_response,
                conversation_id,
                this.env.ELEVENLABS_API_KEY,
                this.env.ELEVENLABS_AGENT_ID
              );
            } catch (err: any) {
              console.error("❌ Failed to send to ElevenLabs:", err.message);
            }
          } else {
            console.warn("⚠️ ElevenLabs API key or agent ID missing");
          }

          // Retourne la réponse à Dust
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "clarification_sent",
                question: question,
                suggestions: suggestions,
                context: params.context,
                formatted_response: formatted_response,
                conversation_id: conversation_id,
                elevenlabs_notified: elevenlabs_notified,
                instruction: "Clarification envoyée à ElevenLabs. Attendre la réponse utilisateur."
              })
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err.message);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                status: "error",
                error: err.message
              })
            }],
            isError: true
          };
        }
      }
    );
  }

  // ========================================
  // OUTIL 7 : Créer une tâche (rapport)
  // ========================================
  private registerCreateTaskReportTool(supabase: any) {
    this.server.tool(
      "create_task_report",
      "Enregistre un rapport d'activité vocal comme une tâche dans le système",
      {
        staff_id: z.string().describe("UUID du membre du staff qui fait le rapport"),
        location: z.string().describe("Localisation (nom de la chambre ou zone) - OBLIGATOIRE"),
        location_id: z.string().optional().describe("UUID de la localisation si disponible"),
        title: z.string().describe("Titre court du rapport"),
        description: z.string().describe("Description détaillée du rapport"),
        category: z.enum([
          "client_request",
          "incident",
          "internal_task"
        ]).describe("Type de tâche : client_request (demande client), incident (dommage/oubli), internal_task (organisation équipe)"),
        priority: z.enum(["normal", "urgent"]).optional().default("normal"),
        guest_name: z.string().optional().describe("Nom du client concerné si mentionné"),
        voice_note_url: z.string().optional().describe("URL de l'enregistrement audio ElevenLabs"),
        voice_transcript: z.string().optional().describe("Transcription vocale complète"),
        conversation_id: z.string().optional().describe("ID de conversation ElevenLabs (pour traçabilité et anti-doublon)")
      },
      async (params) => {
        try {
          console.log("💾 Creating task report...");

          // ========================================
          // VALIDATION DES INPUTS
          // ========================================
          if (!params.staff_id) {
            console.error("❌ Missing staff_id");
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  error: "Le staff_id est obligatoire pour créer un rapport"
                })
              }],
              isError: true
            };
          }

          if (!params.location) {
            console.error("❌ Missing location");
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  error: "La localisation (location) est obligatoire"
                })
              }],
              isError: true
            };
          }

          // ========================================
          // DÉTECTION DE DOUBLON (via conversation_id)
          // ========================================
          if (params.conversation_id) {
            const { data: existingTask } = await supabase
              .from("task")
              .select("id, title, created_at")
              .eq("voice_conversation_id", params.conversation_id)
              .single();
            
            if (existingTask) {
              console.warn("⚠️ Duplicate task detected for conversation:", params.conversation_id);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    status: "duplicate",
                    task_id: existingTask.id,
                    message: "Tâche déjà créée pour cette conversation",
                    task_title: existingTask.title
                  })
                }]
              };
            }
          }

          // ========================================
          // RÉCUPÉRATION DU NOM COMPLET DU STAFF
          // ========================================
          const { data: staffData } = await supabase
            .from("staff_directory")
            .select("first_name, last_name, full_name")
            .eq("id", params.staff_id)
            .single();

          const staff_full_name = staffData 
            ? `${staffData.first_name} ${staffData.last_name}`
            : "Staff inconnu";

          // ========================================
          // INSERTION DANS SUPABASE
          // ========================================
          const { data, error } = await supabase
            .from("task")
            .insert({
              // Champs obligatoires
              title: params.title,
              description: params.description,
              origin_type: "team",
              created_by: params.staff_id,
              assigned_to: ["75d4096b-55b5-40c1-a593-0e7daecd8c64"], // Océane (chef gouvernantes)
              location: params.location,
              location_id: params.location_id || null,
              category: params.category,
              priority: params.priority || "normal",
              service: "housekeeping",
              status: "pending",

              // Champs optionnels
              guest_name: params.guest_name || null,
              voice_note_url: params.voice_note_url || null,
              voice_transcript: params.voice_transcript || params.description,
              voice_conversation_id: params.conversation_id || null,

              // Métadonnées
              requires_validation: false,
              created_at: new Date().toISOString()
            })
            .select("id, title, location, status, priority, category, created_by, created_at")
            .single();

          if (error) {
            console.error("❌ Supabase insert error:", error.message);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  error: `Erreur lors de la création du rapport: ${error.message}`
                })
              }],
              isError: true
            };
          }

          console.log("✅ Task report created:", data.id);

          // ========================================
          // ENVOI À ELEVENLABS VIA API REST HTTP
          // ========================================
          let elevenlabs_notified = false;
          if (params.conversation_id && this.env.ELEVENLABS_API_KEY && this.env.ELEVENLABS_AGENT_ID) {
            const confirmationMessage = `Sokle a bien enregistré : ${staff_full_name}, ${params.location}, ${params.title}, ${params.priority}. L'équipe ${data.category === 'incident' ? 'maintenance' : 'housekeeping'} a été notifiée immédiatement. Bonne journée !`;
            
            try {
              elevenlabs_notified = await this.sendToElevenLabs(
                confirmationMessage,
                params.conversation_id,
                this.env.ELEVENLABS_API_KEY,
                this.env.ELEVENLABS_AGENT_ID
              );
            } catch (err: any) {
              console.error("❌ Failed to send confirmation to ElevenLabs:", err.message);
            }
          }

          // ========================================
          // RETOUR ENRICHI AVEC TOUTES LES DONNÉES
          // ========================================
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "success",
                task_created: true,
                task_id: data.id,
                task_details: {
                  title: data.title,
                  location: data.location,
                  priority: data.priority,
                  staff_name: staff_full_name,
                  category: data.category,
                  status: data.status,
                  created_at: data.created_at
                },
                conversation_id: params.conversation_id,
                elevenlabs_notified: elevenlabs_notified,
                message: `Tâche ${data.priority} enregistrée avec succès !`
              })
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err.message);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                status: "error",
                error: err.message
              })
            }],
            isError: true
          };
        }
      }
    );
  }
}

// ========================================
// SERVEUR EXPRESS POUR RENDER
// ========================================
const app = express();
app.use(express.json());

// Route GET / - Health check
app.get('/', (req, res) => {
  res.json({
    name: "mcp-hospitality",
    version: "3.0.0",
    description: "Voice Activity Reports for HospitalityOS",
    tools: [
      "test_supabase",
      "get_all_staff",
      "get_all_locations",
      "verify_staff_identity",
      "verify_location",
      "ask_clarification",
      "create_task_report"
    ],
    status: "ready"
  });
});

// Route GET /mcp - Point d'entrée MCP avec SSE
app.get('/mcp', async (req, res) => {
  console.log('📡 Incoming SSE connection from Dust...');
  
  try {

    const mcpInstance = new HospitalityMCP({
      SUPABASE_URL: process.env.SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
      ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID
    });

    await mcpInstance.init();

    // Transport SSE
    const transport = new SSEServerTransport('/mcp', res);
    await mcpInstance.server.connect(transport);

    console.log('✅ SSE connection established with Dust');

    req.on('close', () => {
      console.log('🔌 Dust SSE connection closed');
    });

  } catch (error: any) {
    console.error('❌ MCP Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ MCP Server listening on port ${PORT}`);
});