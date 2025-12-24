
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SendBulkEmailRequest = {
  tournament_id: string;
  subject: string;
  html?: string;
  text?: string;
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function isValidEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const e = email.trim();
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Escape HTML entities to prevent XSS attacks
function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#47;');
}

// Sanitize HTML by removing dangerous tags and attributes (server-side)
function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove on* event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/href\s*=\s*["']data:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');
  
  // Remove iframe, object, embed, form tags
  sanitized = sanitized.replace(/<\/?iframe[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?object[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?embed[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?form[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?input[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?button[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?link[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?meta[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/?base[^>]*>/gi, '');
  
  return sanitized.trim();
}

// Validate and sanitize text input (no HTML allowed)
function sanitizeTextInput(text: string, maxLength: number = 10000): string {
  if (!text || typeof text !== 'string') return '';
  // Truncate to max length
  const truncated = text.slice(0, maxLength);
  // Escape all HTML
  return escapeHtml(truncated);
}

// Validate subject line
function sanitizeSubject(subject: string): string {
  if (!subject || typeof subject !== 'string') return '';
  // Remove newlines and limit length
  return escapeHtml(subject.replace(/[\r\n]/g, ' ').slice(0, 200).trim());
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // SECURITY: Verify the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const tournament_id = body.tournament_id;
    const rawSubject = body.subject;
    const rawHtml = body.html;
    const rawText = body.text;

    // Validate required fields
    if (!tournament_id || typeof tournament_id !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid or missing tournament_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rawSubject || typeof rawSubject !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid or missing subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((!rawHtml && !rawText) || (rawHtml && typeof rawHtml !== 'string') || (rawText && typeof rawText !== 'string')) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing html/text content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side sanitization of all user inputs
    const subject = sanitizeSubject(rawSubject);
    const sanitizedHtmlContent = rawHtml ? sanitizeHtml(rawHtml) : '';
    const sanitizedTextContent = rawText ? sanitizeTextInput(rawText) : '';
    
    console.log('Input sanitized - subject length:', subject.length, 'html length:', sanitizedHtmlContent.length);

    // Look up tournament and organizer email
    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .select("id, title, organizer_id")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) {
      return new Response(
        JSON.stringify({ error: "Tournament not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Verify the user is the tournament organizer
    if (tournament.organizer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only tournament organizers can send emails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let organizerEmail: string | undefined = undefined;
    if (tournament.organizer_id) {
      const { data: organizerProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", tournament.organizer_id)
        .maybeSingle();
      organizerEmail = organizerProfile?.email || undefined;
    }

    // Get teams in the tournament (non-backup)
    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, contact_email, is_backup")
      .eq("tournament_id", tournament_id)
      .eq("is_backup", false);

    if (teamsErr) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch teams" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamIds = (teams || []).map((t) => t.id);
    const teamEmails = (teams || []).map((t) => t.contact_email).filter(isValidEmail);

    // Get players contact info for these teams from secure table
    let playerEmails: string[] = [];
    if (teamIds.length > 0) {
      const { data: playerContacts, error: contactsErr } = await supabase
        .from("player_contacts")
        .select(`
          email,
          player_id,
          players!inner(team_id)
        `)
        .in("players.team_id", teamIds);

      if (contactsErr) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch player contacts" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      playerEmails = (playerContacts || []).map((pc) => pc.email).filter(isValidEmail);
    }

    const uniqueRecipients = Array.from(new Set([...teamEmails, ...playerEmails]));
    if (uniqueRecipients.length === 0) {
      return new Response(
        JSON.stringify({ totalRecipients: 0, sent: 0, failedBatches: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use server-side sanitized content
    const finalHtml = sanitizedHtmlContent || (sanitizedTextContent ? `<p>${sanitizedTextContent.replace(/\n/g, "<br/>")}</p>` : "");
    const finalText = rawText ? rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 10000) : "";

    const batches = chunk(uniqueRecipients, 90);
    let sentBatches = 0;
    let failedBatches = 0;

    for (const batch of batches) {
      try {
        const resp = await resend.emails.send({
          from: "Lovable Tournaments <onboarding@resend.dev>",
          to: [organizerEmail || "onboarding@resend.dev"],
          bcc: batch,
          subject,
          html: finalHtml,
          text: finalText,
          reply_to: organizerEmail ? [organizerEmail] : undefined,
        });
        if ((resp as any)?.error) {
          console.error("Resend batch error:", (resp as any).error);
          failedBatches++;
        } else {
          sentBatches++;
        }
      } catch (e) {
        console.error("Resend batch exception:", e);
        failedBatches++;
      }
    }

    // Log the action
    await supabase.rpc("log_tournament_action", {
      tournament_id: tournament_id,
      action: "bulk_email_sent",
      details: {
        subject,
        totalRecipients: uniqueRecipients.length,
        batches: batches.length,
        sentBatches,
        failedBatches,
      },
    });

    return new Response(
      JSON.stringify({
        totalRecipients: uniqueRecipients.length,
        batches: batches.length,
        sentBatches,
        failedBatches,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-bulk-email error:", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
