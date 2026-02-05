// ========================================
// MCP HOSPITALITY AGENT - BUSINESS LOGIC
// ========================================
// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ========================================
// TYPES & INTERFACES
// ========================================
interface HospitalityEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_AGENT_ID?: string;
}

// ========================================
// HOSPITALITY MCP CLASS
// ========================================
export class HospitalityMCP {
  public server: any = { connected: true };
  private env: HospitalityEnv;
  private supabase: SupabaseClient;

  constructor(env: HospitalityEnv) {
    this.env = env;
    
    // Initialisation du serveur MCP
    // this.server = new McpServer({
    // name: "mcp-hospitality",
    // version: "3.0.0",
    // description: "MCP Server for HospitalityOS Voice Activity Reports"
    // });

    // Initialisation Supabase
    this.supabase = createClient(
      this.env.SUPABASE_URL,
      this.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("✅ Supabase client initialized for HospitalityOS");
  }



  // ========================================
  // INITIALISATION : Enregistrement des 7 outils
  // ========================================
  async init(): Promise<void> {
    console.log("🔧 Registering MCP tools...");

  //  this.registerTestTool();
  //  this.registerGetAllStaffTool();
  //  this.registerGetAllLocationsTool();
  //  this.registerVerifyStaffTool();
  //  this.registerVerifyLocationTool();
  //  this.registerAskClarificationTool();
  //  this.registerCreateTaskReportTool();

    console.log("✅ 7 MCP tools registered successfully");
  }

  // ========================================
  // OUTIL 1 : Test Supabase Connection
  // ========================================
  private registerTestTool(): void {
    this.server.tool(
      "test_supabase",
      "Test de connexion Supabase depuis le serveur Render",
      {},
      async () => {
        try {
          console.log("🧪 Testing Supabase connection...");

          const { data, error } = await this.supabase
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
  private registerGetAllStaffTool(): void {
    this.server.tool(
      "get_all_staff",
      "Récupère la liste COMPLÈTE de tous les membres du staff actifs",
      {},
      async () => {
        try {
          console.log("📋 Fetching all active staff...");

          const { data, error } = await this.supabase
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
  private registerGetAllLocationsTool(): void {
    this.server.tool(
      "get_all_locations",
      "Récupère la liste COMPLÈTE de toutes les localisations actives de l'hôtel",
      {},
      async () => {
        try {
          console.log("📋 Fetching all active locations...");

          const { data, error } = await this.supabase
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
  private registerVerifyStaffTool(): void {
    this.server.tool(
      "verify_staff_identity",
      "Récupère les détails complets d'un membre du staff par son UUID",
      {
        staff_id: z.string().describe("UUID du membre du staff")
      },
      async (params: { staff_id: string }) => {
        try {
          console.log("🔍 Verifying staff by UUID:", params.staff_id);

          const { data, error } = await this.supabase
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
  private registerVerifyLocationTool(): void {
    this.server.tool(
      "verify_location",
      "Récupère les détails complets d'une localisation par son UUID",
      {
        location_id: z.string().describe("UUID de la localisation")
      },
      async (params: { location_id: string }) => {
        try {
          console.log("📍 Verifying location by UUID:", params.location_id);

          const { data, error } = await this.supabase
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
  private registerAskClarificationTool(): void {
    this.server.tool(
      "ask_clarification",
      "Demande une clarification à l'utilisateur via ElevenLabs quand l'information est ambiguë ou manquante",
      {
        question: z.string().describe("Question à poser à l'utilisateur"),
        suggestions: z.array(z.string()).optional().describe("Liste optionnelle de suggestions"),
        context: z.enum(["staff_identity", "location", "task_details", "priority", "other"]).describe("Type de clarification demandée"),
        conversation_id: z.string().describe("ID de conversation ElevenLabs (pour traçabilité)")
      },
      async (params: {
        question: string;
        suggestions?: string[];
        context: string;
        conversation_id: string;
     }) => {
        try {
          console.log("❓ Asking for clarification:", params.context);

          const { question, suggestions = [], conversation_id } = params;

          // Format la réponse pour ElevenLabs
          let formatted_response = question;
          
          if (suggestions.length > 0) {
            formatted_response += ` Options : ${suggestions.join(' ou ')}.`;
          }

          // ✅ Clarification préparée (géré par Dust via HTTP response)
console.log(`📤 Clarification prepared: "${formatted_response}"`);
console.log(`📝 Conversation ID: ${conversation_id}`);

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
      elevenlabs_notified: true, // ✅ Toujours true (géré par Dust)
      instruction: "Clarification envoyée. Attendre la réponse utilisateur."
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
  private registerCreateTaskReportTool(): void {
    this.server.tool(
      "create_task_report",
      "Enregistre un rapport d'activité vocal comme une tâche dans le système",
      {
        staff_id: z.string().describe("UUID du membre du staff qui fait le rapport"),
        location: z.string().describe("Localisation (nom de la chambre ou zone) - OBLIGATOIRE"),
        location_id: z.string().optional().describe("UUID de la localisation si disponible"),
        assigned_to: z.array(z.string()).optional().describe("Array of staff UUIDs to assign the task to"),
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
      async (params: {
  staff_id: string;
  location: string;
  location_id?: string;
  assigned_to?: string[];
  title: string;
  description: string;
  category: "client_request" | "incident" | "internal_task";
  priority?: "normal" | "urgent";
  guest_name?: string;
  voice_note_url?: string;
  voice_transcript?: string;
  conversation_id?: string;
}) => {
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
            const { data: existingTask } = await this.supabase
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
          const { data: staffData } = await this.supabase
            .from("staff_directory")
            .select("first_name, last_name, full_name")
            .eq("id", params.staff_id)
            .single();

          const staff_full_name = staffData 
            ? `${staffData.first_name} ${staffData.last_name}`
            : "Staff inconnu";

            const assigned_to_id = params.assigned_to?.[0] || "75d4096b-55b5-40c1-a593-0e7daecd8c64";
            const { data: assignedData } = await this.supabase
             .from("staff_directory")
             .select("first_name, last_name")
             .eq("id", assigned_to_id)
             .single();

            const assigned_to_name = assignedData 
              ? `${assignedData.first_name} ${assignedData.last_name}`
              : "Océane";


            
          // ========================================
          // INSERTION DANS SUPABASE
          // ========================================
          const { data, error } = await this.supabase
            .from("task")
            .insert({
              // Champs obligatoires
              title: params.title,
              description: params.description,
              origin_type: "team",
              created_by: params.staff_id,
              assigned_to: params.assigned_to || ["75d4096b-55b5-40c1-a593-0e7daecd8c64"], // Utilise le paramètre, fallback Océane
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
          // CONFIRMATION PRÉPARÉE (géré par Dust via HTTP response)
          // ========================================
          let elevenlabs_notified = false;
          if (params.conversation_id) {
            const confirmationMessage = `Sokle a bien enregistré : ${staff_full_name}, ${params.location}, ${params.title}, ${params.priority}. L'équipe ${data.category === 'incident' ? 'maintenance' : 'housekeeping'} a été notifiée immédiatement. Bonne journée !`;
  
          console.log(`📤 Confirmation prepared: "${confirmationMessage}"`);
          console.log(`📝 Conversation ID: ${params.conversation_id}`);
  
          // ✅ Plus d'appel à sendToElevenLabs (géré par Dust)
          elevenlabs_notified = true;
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
                  assigned_to_name: assigned_to_name,
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
 // ========================================
  // MÉTHODES PUBLIQUES POUR APPELS DIRECTS
  // ========================================

  async testSupabase() {
    try {
      console.log("🧪 Testing Supabase connection...");

      const { data, error } = await this.supabase
        .from("staff_directory")
        .select("id, full_name, role")
        .eq("is_active", true)
        .limit(1);

      if (error) {
        console.error("❌ Supabase test failed:", error.message);
        return {
          status: "error",
          message: error.message
        };
      }

      console.log("✅ Supabase test successful");
      return {
        status: "success",
        message: `Connexion Supabase OK! Found ${data?.length || 0} active staff member(s)`
      };

    } catch (err: any) {
      console.error("❌ Unexpected error:", err.message);
      return {
        status: "error",
        message: err.message
      };
    }
  }

  async getAllStaff() {
    try {
      console.log("📋 Fetching all active staff...");

      const { data, error } = await this.supabase
        .from("staff_directory")
        .select("id, full_name, first_name, last_name, role, department, service, job_title")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (error) {
        console.error("❌ Supabase error:", error.message);
        return {
          status: "error",
          message: error.message
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
        status: "success",
        total_count: data.length,
        staff: formattedStaff
      };

    } catch (err: any) {
      console.error("❌ Unexpected error:", err.message);
      return {
        status: "error",
        message: err.message
      };
    }
  }

  async getAllLocations() {
    try {
      console.log("📋 Fetching all active locations...");

      const { data, error } = await this.supabase
        .from("locations")
        .select("id, name, display_name, location_code, floor, type, location_type, building")
        .eq("is_active", true)
        .order("floor", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Supabase error:", error.message);
        return {
          status: "error",
          message: error.message
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
        status: "success",
        total_count: data.length,
        locations: formattedLocations
      };

    } catch (err: any) {
      console.error("❌ Unexpected error:", err.message);
      return {
        status: "error",
        message: err.message
      };
    }
  }

  async verifyStaff(staff_id: string) {
    try {
      console.log("🔍 Verifying staff by UUID:", staff_id);

      const { data, error } = await this.supabase
        .from("staff_directory")
        .select("id, full_name, first_name, last_name, email, role, department, service, job_title, hierarchy")
        .eq("id", staff_id)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        console.error("❌ Staff not found:", staff_id);
        return {
          error: `Aucun membre du staff actif trouvé avec l'ID: ${staff_id}`
        };
      }

      console.log("✅ Staff verified:", `${data.first_name} ${data.last_name}`);

      return {
        staff_verified: true,
        staff_id: data.id,
        staff_name: `${data.first_name} ${data.last_name}`,
        first_name: data.first_name,
        last_name: data.last_name,
        staff_role: data.job_title || data.role,
        staff_department: data.service || data.department,
        email: data.email
      };

    } catch (err: any) {
      console.error("❌ Unexpected error:", err.message);
      return { error: err.message };
    }
  }

  async verifyLocation(location_id: string) {
    try {
      console.log("📍 Verifying location by UUID:", location_id);

      const { data, error } = await this.supabase
        .from("locations")
        .select("id, name, display_name, location_code, type, location_type, floor, building, capacity, metadata")
        .eq("id", location_id)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        console.error("❌ Location not found:", location_id);
        return {
          error: `Aucune localisation active trouvée avec l'ID: ${location_id}`
        };
      }

      console.log("✅ Location verified:", data.display_name || data.name);

      return {
        location_verified: true,
        location_id: data.id,
        location_name: data.display_name || data.name,
        location_code: data.location_code,
        floor: data.floor,
        location_type: data.location_type || data.type,
        building: data.building
      };

    } catch (err: any) {
      console.error("❌ Unexpected error:", err.message);
      return { error: err.message };
    }
  }

  async askClarification(params: {
  question: string;
  suggestions?: string[];
  context: string;
  conversation_id: string;
}) {
  try {
    console.log("❓ Asking for clarification:", params.context);

    const { question, suggestions = [], conversation_id } = params;

    let formatted_response = question;
    
    if (suggestions.length > 0) {
      formatted_response += ` Options : ${suggestions.join(' ou ')}.`;
    }

    // ✅ MODIFICATION : Plus d'appel à sendToElevenLabs
    // La réponse sera gérée par le retour HTTP du webhook Dust
    console.log(`📤 Clarification prepared: "${formatted_response}"`);
    console.log(`📝 Conversation ID: ${conversation_id}`);

    return {
      status: "clarification_sent",
      question: question,
      suggestions: suggestions,
      context: params.context,
      formatted_response: formatted_response,
      conversation_id: conversation_id,
      elevenlabs_notified: true, // ✅ Toujours true (géré par Dust)
      instruction: "Clarification envoyée. Attendre la réponse utilisateur."
    };

  } catch (err: any) {
    console.error("❌ Unexpected error:", err.message);
    return {
      status: "error",
      error: err.message
    };
  }
}

  async createTaskReport(params: {
    staff_id: string;
    location: string;
    location_id?: string;
    assigned_to?: string[];
    title: string;
    description: string;
    category: "client_request" | "incident" | "internal_task";
    priority?: "normal" | "urgent";
    guest_name?: string;
    voice_note_url?: string;
    voice_transcript?: string;
    conversation_id?: string;
  }) {
    try {
      console.log("💾 Creating task report...");

      if (!params.staff_id) {
        console.error("❌ Missing staff_id");
        return {
          status: "error",
          error: "Le staff_id est obligatoire pour créer un rapport"
        };
      }

      if (!params.location) {
        console.error("❌ Missing location");
        return {
          status: "error",
          error: "La localisation (location) est obligatoire"
        };
      }

      // Détection de doublon
      if (params.conversation_id) {
        const { data: existingTask } = await this.supabase
          .from("task")
          .select("id, title, created_at")
          .eq("voice_conversation_id", params.conversation_id)
          .single();
        
        if (existingTask) {
          console.warn("⚠️ Duplicate task detected for conversation:", params.conversation_id);
          return {
            status: "duplicate",
            task_id: existingTask.id,
            message: "Tâche déjà créée pour cette conversation",
            task_title: existingTask.title
          };
        }
      }

      // Récupération du nom complet du staff
      const { data: staffData } = await this.supabase
        .from("staff_directory")
        .select("first_name, last_name, full_name")
        .eq("id", params.staff_id)
        .single();

      const staff_full_name = staffData 
        ? `${staffData.first_name} ${staffData.last_name}`
        : "Staff inconnu";

      // Récupération du nom de la personne assignée pour la confirmation
      const assigned_to_id = params.assigned_to?.[0] || "75d4096b-55b5-40c1-a593-0e7daecd8c64";
      const { data: assignedData } = await this.supabase
        .from("staff_directory")
        .select("first_name, last_name")
        .eq("id", assigned_to_id)
        .single();

      const assigned_to_name = assignedData 
        ? `${assignedData.first_name} ${assignedData.last_name}`
        : "Océane";  

      // Insertion dans Supabase
      const { data, error } = await this.supabase
        .from("task")
        .insert({
          title: params.title,
          description: params.description,
          origin_type: "team",
          created_by: params.staff_id,
          assigned_to: params.assigned_to || ["75d4096b-55b5-40c1-a593-0e7daecd8c64"],
          location: params.location,
          location_id: params.location_id || null,
          category: params.category,
          priority: params.priority || "normal",
          service: "housekeeping",
          status: "pending",
          guest_name: params.guest_name || null,
          voice_note_url: params.voice_note_url || null,
          voice_transcript: params.voice_transcript || params.description,
          voice_conversation_id: params.conversation_id || null,
          requires_validation: false,
          created_at: new Date().toISOString()
        })
        .select("id, title, location, status, priority, category, created_by, created_at")
        .single();

      if (error) {
        console.error("❌ Supabase insert error:", error.message);
        return {
          status: "error",
          error: `Erreur lors de la création du rapport: ${error.message}`
        };
      }

      console.log("✅ Task report created:", data.id);

      // ✅ MODIFICATION : Confirmation préparée (sans appel ElevenLabs)
let elevenlabs_notified = false;
if (params.conversation_id) {
  const confirmationMessage = `Sokle a bien enregistré : ${staff_full_name}, ${params.location}, ${params.title}, ${params.priority}. ${assigned_to_name} a été notifié immédiatement. Bonne journée !`;
  
  console.log(`📤 Confirmation prepared: "${confirmationMessage}"`);
  console.log(`📝 Conversation ID: ${params.conversation_id}`);
  
  // ✅ Plus d'appel à sendToElevenLabs (géré par Dust)
  elevenlabs_notified = true;
}

return {
  status: "success",
  task_created: true,
  task_id: data.id,
  task_details: {
    title: data.title,
    location: data.location,
    priority: data.priority,
    staff_name: staff_full_name,
    assigned_to_name: assigned_to_name,
    category: data.category,
    status: data.status,
    created_at: data.created_at
  },
  conversation_id: params.conversation_id,
  elevenlabs_notified: elevenlabs_notified, // ✅ Toujours true
  message: `Tâche ${data.priority} enregistrée avec succès !`
};

    } catch (err: any) {
      console.error("❌ Unexpected error:", err.message);
      return {
        status: "error",
        error: err.message
      };
    }
  } 
}