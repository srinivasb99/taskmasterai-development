// /functions/src/index.ts

/**
 * Sanitizes error messages to prevent API key leaks
 * Removes API keys from URLs and error messages
 */
function sanitizeErrorMessage(error: any): string {
  if (!error) return "Unknown error occurred";
  
  let message = typeof error === 'string' ? error : (error.message || error.toString());
  
  // Remove API keys from URLs - matches key=APIKEY pattern
  message = message.replace(/[?&]key=[A-Za-z0-9_-]+/g, '?key=***');
  
  // Remove any standalone API keys that look like Google API keys
  message = message.replace(/AIza[A-Za-z0-9_-]{35}/g, 'AIza***');
  
  // Remove any other potential API key patterns
  message = message.replace(/[A-Za-z0-9]{32,}/g, (match: string) => {
    // If it looks like an API key (long alphanumeric string), mask it
    if (match.length >= 32 && /^[A-Za-z0-9_-]+$/.test(match)) {
      return match.substring(0, 4) + '***';
    }
    return match;
  });
  
  return message;
}

import * as admin from "firebase-admin";

import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import fetch from "node-fetch";
import Stripe from "stripe";
import { getFunctions } from "firebase-admin/functions";
import { defineString } from "firebase-functions/params";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { tasks } from "firebase-functions/v2";
// Import v1 functions for simple operations
import * as functionsV1 from "firebase-functions/v1";
import pdf from "pdf-parse";
import mammoth from "mammoth";

import { google } from "googleapis";

// --- Secret Definitions ---
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");
const elevenlabsApiKey = defineString("ELEVENLABS_APIKEY");
const notionClientId = defineString("NOTION_OAUTH_CLIENT_ID");
const notionClientSecret = defineString("NOTION_OAUTH_CLIENT_SECRET");
const googleClientId = defineString("GOOGLE_OAUTH_CLIENT_ID");
const googleClientSecret = defineString("GOOGLE_OAUTH_CLIENT_SECRET");
const youtubeApiKey = defineString("YOUTUBE_API_KEY");

// --- REVISED AND ADDED SECRETS FOR TIERED TASKMASTER API KEYS ---
const taskMasterApiKeyPaid = defineString("GEMINI_API_KEY_PAID"); // For Pro/Premium users
const taskMasterApiKeyFree = defineString("GEMINI_API_KEY_FREE"); // For Basic users

// --- TASKMASTER LIVE API KEY ---
// const taskMasterLiveApiKey = defineString("GEMINI_LIVE_API_KEY"); // For Live API (requires standard API key)

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

// Hardcoded user lists for backend validation, matching the client-side lists.
const PREMIUM_EMAILS = [
  "bajinsrinivasr@lexington1.net",
  "1cosmic20@gmail.com", 
  "amlitha@gmail.com",
  "suryar9108@gmail.com",
  "poojarameshkumar789@gmail.com",
  "achallapureddy@gmail.com",
  "ali.ahsan.a214@gmail.com",
  "amrish.naranappa@gmail.com",
  "navaneeth.ravindranath@gmail.com",
  "Goduwin_Ravi@yahoo.com",
  "gautham.paddu@outlook.com", 
  "Isha.kandhaluram@gmail.com",
  "learner@example.com",
  "draco77654@gmail.com",
  "rithikrt1@gmail.com",
  "Mithun.kutuva@gmail.com",
  "rickmrreddy@gmail.com",
  "shankartkraj@gmail.com",
  "akaash.chirravuri@gmail.com",
  "rebba.harsha@gmail.com",
  "rikhilmajji32@gmail.com"
];
const PRO_EMAILS = ["srinibaj10@gmail.com"];

// ---------- CORS helper (for HTTP endpoints) ----------
function setCors(req: any, res: any) {
  const origin = req.headers.origin;
  const ALLOWED = ["https://www.taskmaster.one", "https://taskmaster.one", "http://localhost:5173"];
  if (ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ---------- Server-side Rate Limiting ----------
const RATE_LIMITS = {
  api: { basic: 20, pro: 60, premium: 120 },      // per minute
  chat: { basic: 10, pro: 30, premium: 60 },      // per minute  
  notes: { basic: 5, pro: 20, premium: 100 },     // per hour
  imageGen: { basic: 5, pro: 25, premium: 100 },  // per day
  proModel: { basic: 0, pro: 0, premium: 30 }     // per minute - advanced reasoning model only for premium
};

const rateLimitStore = new Map<string, { count: number, windowStart: number }>();

function checkServerRateLimit(uid: string, userTier: UserTier, type: keyof typeof RATE_LIMITS, windowMs: number): boolean {
  const limit = RATE_LIMITS[type][userTier];
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${uid}:${type}:${windowStart}`;
  
  let entry = rateLimitStore.get(key);
  if (!entry || entry.windowStart !== windowStart) {
    entry = { count: 0, windowStart };
    rateLimitStore.set(key, entry);
  }
  
  if (entry.count >= limit) {
    return false; // Rate limit exceeded
  }
  
  entry.count += 1;
  rateLimitStore.set(key, entry);
  return true;
}

// Clean up old entries every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

// SECURITY: Usage monitoring and alerts
const usageTracker = new Map<string, { count: number, lastReset: number }>();

function trackModelUsage(model: string, userId: string) {
  const hour = Math.floor(Date.now() / (60 * 60 * 1000));
  const key = `${model}:${hour}`;
  
  let entry = usageTracker.get(key);
  if (!entry) {
    entry = { count: 0, lastReset: hour };
    usageTracker.set(key, entry);
  }
  
  entry.count += 1;
  
  // Alert on suspicious usage patterns
  if (model === "gemini-2.5-pro" && entry.count > 50) {
    console.error(`USAGE ALERT: Unusual spike in ${model} usage: ${entry.count} requests in hour ${hour}`);
  }
  
  // Alert on Live API usage spikes
  if (model.includes("live") && entry.count > 100) {
    console.error(`USAGE ALERT: Unusual spike in Live API ${model} usage: ${entry.count} requests in hour ${hour}`);
  }
  
  // Log detailed usage for premium models
  if (model === "gemini-2.5-pro") {
    // Premium model usage tracked
  }
  
  // Log Live API usage
  if (model.includes("live")) {
    // Live API usage tracked
  }
}

// SECURITY: Emergency controls
let emergencyReasoningDisabled = false;

// Emergency function to disable reasoning globally
export const emergencyDisableReasoning = onCall(async (request) => {
  // Only allow admins to call this
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  
  const email = request.auth.token.email?.toLowerCase();
  const adminEmails = ["srinibaj10@gmail.com", "bajinsrinivasr@lexington1.net"];
  
  if (!email || !adminEmails.includes(email)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  
  emergencyReasoningDisabled = !emergencyReasoningDisabled;
  
  console.error(`EMERGENCY: Reasoning mode ${emergencyReasoningDisabled ? 'DISABLED' : 'ENABLED'} by admin ${email} at ${new Date().toISOString()}`);
  
  return { 
    success: true, 
    reasoningDisabled: emergencyReasoningDisabled,
    message: `Reasoning mode is now ${emergencyReasoningDisabled ? 'DISABLED' : 'ENABLED'}`
  };
});

// ---------- Monthly Usage Limits ----------
const MONTHLY_LIMITS = {
  chat: { basic: 25, pro: 500, premium: Infinity },
  pdfAi: { basic: 5, pro: 25, premium: Infinity },
  youtube: { basic: 3, pro: 15, premium: Infinity }
} as const;

// Helper to get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Legacy functions removed - now using generic checkMonthlyUsageLimit and incrementMonthlyUsage

// Generic function to check monthly usage limits for different interaction types
async function checkMonthlyUsageLimit(uid: string, userTier: UserTier, limitType: keyof typeof MONTHLY_LIMITS): Promise<boolean> {
  const currentMonth = getCurrentMonth();
  const limit = MONTHLY_LIMITS[limitType][userTier];
  
  if (limit === Infinity) return true; // Premium users have unlimited for most features
  
  try {
    const usageRef = db.collection('users').doc(uid).collection('usage').doc(limitType);
    const usageDoc = await usageRef.get();
    
    if (!usageDoc.exists) {
      // First time this month, create the document
      await usageRef.set({ count: 0, month: currentMonth });
      return true;
    }
    
    const data = usageDoc.data();
    if (data?.month !== currentMonth) {
      // New month, reset count
      await usageRef.set({ count: 0, month: currentMonth });
      return true;
    }
    
    const currentCount = data?.count || 0;
    return currentCount < limit;
    
  } catch (error) {
    console.error(`Error checking monthly ${limitType} limit for ${uid}:`, error);
    return false; // Fail closed for security
  }
}

// Generic function to increment monthly usage for different interaction types
async function incrementMonthlyUsage(uid: string, limitType: keyof typeof MONTHLY_LIMITS): Promise<void> {
  const currentMonth = getCurrentMonth();
  try {
    const usageRef = db.collection('users').doc(uid).collection('usage').doc(limitType);
    await db.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);
      
      if (!usageDoc.exists || usageDoc.data()?.month !== currentMonth) {
        transaction.set(usageRef, { count: 1, month: currentMonth, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        transaction.update(usageRef, { 
          count: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } catch (error) {
    console.error(`Error incrementing monthly ${limitType} usage for ${uid}:`, error);
    // Don't throw - we don't want to fail the request if usage tracking fails
  }
}


// ---------- Shared core for TaskMaster proxy (used by callable and HTTP) ----------
type UserTier = "basic" | "pro" | "premium";

async function runTaskMasterProxyCore(
  data: any,
  uid: string,
  email?: string | null
) {
  const { contents, generationConfig, tools, systemInstruction, isImageGen, useLiteModel, useThinkHarder, interactionType } = data || {};
  if (!contents) {
    throw new HttpsError("invalid-argument", "The 'contents' payload is required.");
  }

  // Determine the user's tier securely on the backend (matching frontend logic)
  let userTier: UserTier = "basic";
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as any;
      
      // Check for active student discount first (grants pro tier)
      if (userData.studentDiscountGranted && userData.studentDiscountExpiresAt) {
        const studentExpiresDate = userData.studentDiscountExpiresAt.toDate ? userData.studentDiscountExpiresAt.toDate() : new Date(userData.studentDiscountExpiresAt);
        if (studentExpiresDate && studentExpiresDate > new Date()) {
          userTier = "pro";
        }
      }
      
      // Check for free premium award (if not already set by student discount)
      if (userTier === "basic" && userData.premiumAwardedUntil) {
        const awardedUntilDate = userData.premiumAwardedUntil.toDate ? userData.premiumAwardedUntil.toDate() : new Date(userData.premiumAwardedUntil);
        if (awardedUntilDate && awardedUntilDate > new Date()) {
          userTier = "premium";
        }
      }
      
      // Check for active subscription (if not already set by above)
      if (userTier === "basic" && userData.subscriptionStatus === "active" && (userData.activeTier === "pro" || userData.activeTier === "premium")) {
        userTier = userData.activeTier;
      }
      
      // Check hardcoded email lists (if not already set by above)
      if (userTier === "basic" && email) {
        const e = email.toLowerCase();
        if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
        else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
      }
      
      // Fallback to user's activeTier if still basic
      if (userTier === "basic" && userData.activeTier && (userData.activeTier === "pro" || userData.activeTier === "premium")) {
        userTier = userData.activeTier;
      }
    } else if (email) {
      // User doc doesn't exist, check hardcoded email lists
      const e = email.toLowerCase();
      if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
      else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
    }
  } catch (error) {
    console.error("Error checking user tier in proxy:", error);
  }

  // Check monthly usage limits based on interaction type (only for non-image generation requests)
  if (!isImageGen && interactionType) {
    // Only check limits if an interactionType is explicitly provided
    // No interactionType = unlimited system function (greetings, chat names, etc.)
    
    // Validate that the limitType is valid
    if (!MONTHLY_LIMITS[interactionType as keyof typeof MONTHLY_LIMITS]) {
      console.warn(`Invalid interaction type: ${interactionType}, treating as unlimited system function`);
      // Don't apply any limits for invalid interaction types
    } else {
      // Use the appropriate limit check based on interaction type
      const canUseFeature = await checkMonthlyUsageLimit(uid, userTier, interactionType as keyof typeof MONTHLY_LIMITS);
      if (!canUseFeature) {
        const limit = MONTHLY_LIMITS[interactionType as keyof typeof MONTHLY_LIMITS][userTier];
        let errorMessage = '';
        
        switch (interactionType) {
          case 'chat':
            errorMessage = `Monthly chat limit exceeded. You can send ${limit} messages per month. ${userTier === 'basic' ? 'Upgrade to Pro for 500 messages per month!' : userTier === 'pro' ? 'Upgrade to Premium for unlimited messages!' : ''}`;
            break;
          case 'pdfAi':
            errorMessage = `Monthly Text/PDF note limit exceeded. You can create ${limit} Text/PDF notes per month. ${userTier === 'basic' ? 'Upgrade to Pro for 25 Text/PDF notes per month!' : userTier === 'pro' ? 'Upgrade to Premium for unlimited Text/PDF notes!' : ''}`;
            break;
          case 'youtube':
            errorMessage = `Monthly YouTube note limit exceeded. You can create ${limit} YouTube notes per month. ${userTier === 'basic' ? 'Upgrade to Pro for 15 YouTube notes per month!' : userTier === 'pro' ? 'Upgrade to Premium for unlimited YouTube notes!' : ''}`;
            break;
          default:
            errorMessage = `Monthly ${interactionType} limit exceeded. You can use ${limit} ${interactionType} per month.`;
        }
        
        throw new HttpsError(
          "resource-exhausted",
          errorMessage
        );
      }
    }
  }

  // Apply server-side rate limiting
  const rateLimitType = isImageGen ? 'imageGen' : 'api';
  const windowMs = rateLimitType === 'imageGen' ? (24 * 60 * 60 * 1000) : (60 * 1000); // day vs minute
  
  if (!checkServerRateLimit(uid, userTier, rateLimitType, windowMs)) {
    const limit = RATE_LIMITS[rateLimitType][userTier];
    const windowText = rateLimitType === 'imageGen' ? 'day' : 'minute';
    throw new HttpsError(
      "resource-exhausted", 
      `Rate limit exceeded. You can make ${limit} ${rateLimitType} requests per ${windowText}. ${userTier === 'basic' ? 'Upgrade to Pro or Premium for higher limits!' : ''}`
    );
  }

  const key = (userTier === "pro" || userTier === "premium") ? taskMasterApiKeyPaid.value() : taskMasterApiKeyFree.value();
  if (!key) {
    throw new HttpsError("internal", "Server configuration error: API key is missing.");
  }

  // SECURITY: Strict whitelist of allowed models
  const ALLOWED_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite", 
    "gemini-2.5-flash-image-preview",
    "gemini-2.5-pro"  // ONLY the non-exp version
  ];

  // Determine model based on request type and Reasoning setting
  let targetModel = "gemini-2.5-flash"; // Default model
  if (isImageGen) {
    targetModel = "gemini-2.5-flash-image-preview";
  } else if (useLiteModel) {
    targetModel = "gemini-2.5-flash-lite";
  } else if (useThinkHarder && userTier === "premium") {
    // SECURITY: Check emergency disable first
    if (emergencyReasoningDisabled) {
      throw new HttpsError("unavailable", "Reasoning mode is temporarily disabled for maintenance. Please try again later.");
    }
    
    // Only Premium users can use the reasoning model
    targetModel = "gemini-2.5-pro";
    
    // Apply additional rate limiting for pro model (more expensive/powerful)
    if (!checkServerRateLimit(uid, userTier, 'proModel', 60 * 1000)) {
      const limit = RATE_LIMITS.proModel[userTier];
      throw new HttpsError(
        "resource-exhausted", 
        `Reasoning model rate limit exceeded. You can make ${limit} reasoning requests per minute. This limit is separate from regular API calls due to the advanced model's higher computational cost.`
      );
    }
  } else if (useThinkHarder && (userTier === "pro" || userTier === "basic")) {
    // Pro and Basic users cannot access the pro model
    throw new HttpsError("permission-denied", "Reasoning mode requires a Premium subscription. Upgrade to access advanced reasoning capabilities!");
  }

  // SECURITY: Final validation against whitelist
  if (!ALLOWED_MODELS.includes(targetModel)) {
    console.error(`SECURITY ALERT: Attempted to use unauthorized model: ${targetModel} by user ${uid} (tier: ${userTier})`);
    throw new HttpsError("permission-denied", `Model ${targetModel} is not authorized for use.`);
  }

  // SECURITY: Log all reasoning model usage for monitoring
  if (targetModel === "gemini-2.5-pro") {
    // Reasoning model usage tracked
  }
  
  // Track usage patterns for monitoring
  trackModelUsage(targetModel, uid);
  
  const taskMasterApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;

  // Enable thinking ONLY for Pro model (not Flash or Flash-Lite)
  const enhancedGenerationConfig = useThinkHarder && targetModel.includes('2.5-pro')
    ? {
        ...generationConfig,
        thinking_config: {
          include_thoughts: true,
          thinking_budget: -1
        }
      }
    : generationConfig;

  const apiRequestBody = {
    contents,
    generationConfig: enhancedGenerationConfig,
    tools,
    systemInstruction,
  };

  const response = await fetch(taskMasterApiUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Connection": "keep-alive", // Optimize connection reuse
      "Cache-Control": "no-cache", // Ensure fresh responses
      "User-Agent": `TaskMaster-Backend/1.0 (uid:${uid.substring(0,8)})` // Custom UA for tracking
    },
    body: JSON.stringify(apiRequestBody),
  });

  let responseData: any = {};
  try { responseData = await response.json(); } catch (_) {}

  if (!response.ok) {
    console.error("API Error Response:", responseData);
    const errorMessage = responseData?.error?.message || `API Error (${response.status})`;
    throw new HttpsError("internal", errorMessage);
  }

  // Extract thinking content and clean main response (ONLY for Pro model)
  let thinkingContent = null;
  let cleanedResponseData = { ...responseData };
  
  if (useThinkHarder && targetModel.includes('2.5-pro') && responseData.candidates?.[0]?.content?.parts) {
    const originalParts = responseData.candidates[0].content.parts;
    const cleanedParts = [];
    
    for (const part of originalParts) {
      // Check if this part contains thinking content (Google's API uses 'thought' boolean field)
      if (part.thought === true && part.text) {
        thinkingContent = part.text;
        // Don't include thinking parts in the cleaned response
      } else {
        // Include non-thinking parts in the cleaned response
        cleanedParts.push(part);
      }
    }
    
    // Update the response to only include non-thinking parts
    cleanedResponseData.candidates[0].content.parts = cleanedParts;
  }

  // Add metadata about the model used and reasoning content if available
  const enhancedResponse = {
    ...cleanedResponseData, // Use cleaned response data without thinking content
    thinkingContent: thinkingContent, // Include thinking content separately
    metadata: {
      modelUsed: targetModel,
      reasoningEnabled: useThinkHarder || false,
      userTier: userTier,
      reasoningTokens: responseData.usageMetadata?.thoughtsTokenCount || 0,
      totalTokens: responseData.usageMetadata?.totalTokenCount || 0,
      hasThinking: !!thinkingContent
    }
  };

  // Increment monthly usage for successful requests (only for non-image generation and when interactionType is provided)
  if (!isImageGen && interactionType) {
    // Only increment usage if an interactionType is explicitly provided
    // No interactionType = unlimited system function (no usage tracking)
    
    // Validate that the limitType is valid before incrementing
    if (MONTHLY_LIMITS[interactionType as keyof typeof MONTHLY_LIMITS]) {
      await incrementMonthlyUsage(uid, interactionType as keyof typeof MONTHLY_LIMITS);
    } else {
      console.warn(`Invalid interaction type for usage increment: ${interactionType}, not tracking usage`);
      // Don't increment usage for invalid interaction types
    }
  }

  return enhancedResponse;
}

// ------------------- FIXED TASKMASTER PROXY ENDPOINTS -------------------

// Callable version (use with Firebase `httpsCallable` — zero CORS issues)
export const taskMasterProxy = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  return runTaskMasterProxyCore(request.data, request.auth.uid, request.auth.token.email);
});

// HTTP version (use with fetch + Bearer ID token) — includes full CORS & preflight
export const taskMasterProxyHttp = onRequest({ region: "us-central1" }, async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!idToken) {
      setCors(req, res);
      res.status(401).json({ error: "unauthenticated", message: "Missing Authorization: Bearer <idToken>" });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const out = await runTaskMasterProxyCore(req.body, decoded.uid, decoded.email || null);

    setCors(req, res);
    res.status(200).json(out);
  } catch (e: any) {
    console.error("taskMasterProxyHttp error:", e);
    setCors(req, res);
    const code = e?.code === "unauthenticated" ? 401 : 500;
    res.status(code).json({ error: e?.code || "internal", message: e?.message || "Internal error" });
  }
});

// ------------------- Google OAuth scopes -------------------
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",        // Full Drive access (read, create, edit) - handles Docs, Sheets, Slides creation
  "https://www.googleapis.com/auth/calendar",     // Full Calendar access
  "https://www.googleapis.com/auth/gmail.modify", // Full Gmail access (read, send, compose, reply, forward)
  "https://www.googleapis.com/auth/documents",    // Google Docs access for content addition
  "https://www.googleapis.com/auth/spreadsheets", // Google Sheets access for data manipulation
  "https://www.googleapis.com/auth/presentations", // Google Slides access for content creation
  "https://www.googleapis.com/auth/tasks",        // Google Tasks access for task management
  // Enhanced scopes for full Google Workspace integration
];

// CORRECTED VERSION of getGoogleAuthUrl
export const getGoogleAuthUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data;
  const { redirectUri } = data as { redirectUri: string };

  if (!redirectUri) {
    throw new HttpsError("invalid-argument", "The redirectUri is required.");
  }

  const allowedRedirectUris = [
    "http://localhost:5173/settings",
    "https://www.taskmaster.one/settings",
    "http://localhost:5173/login",
    "https://www.taskmaster.one/login",
    "http://localhost:5173/onboarding",
    "https://www.taskmaster.one/onboarding",
  ];
  if (!allowedRedirectUris.some((uri) => redirectUri.startsWith(uri))) {
    throw new HttpsError("invalid-argument", `The provided redirectUri is not authorized: ${redirectUri}`);
  }

  const oAuth2Client = new google.auth.OAuth2(
    googleClientId.value(),
    googleClientSecret.value(),
    redirectUri
  );

  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: JSON.stringify({ redirectUri }),
  });

  return { url };
});

// FINAL CORRECTED VERSION of googleOAuthCallback
export const googleOAuthCallback = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { code, state } = request.data;
  const uid = request.auth.uid;

  if (!code || !state) {
    throw new HttpsError("invalid-argument", "The 'code' and 'state' must be provided.");
  }

  let parsedState;
  try {
    parsedState = JSON.parse(state);
  } catch (e) {
    throw new HttpsError("invalid-argument", "Invalid state format.");
  }
  const { redirectUri } = parsedState;

  if (!redirectUri) {
    throw new HttpsError("invalid-argument", "State is missing redirectUri.");
  }

  const oAuth2Client = new google.auth.OAuth2(
    googleClientId.value(),
    googleClientSecret.value(),
    redirectUri
  );

  // One update for all Google services
  const updateData = {
    googleTokens: {},
    googleDriveConnected: true,
    googleCalendarConnected: true,
  };

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    (updateData as any).googleTokens = tokens;

    try {
      await admin.firestore().collection("users").doc(uid).update(updateData);
    } catch (updateError: any) {
      if (updateError.code === 5 || updateError.toString().includes("NOT_FOUND")) {
        await admin.firestore().collection("users").doc(uid).set(updateData);
      } else {
        throw updateError;
      }
    }

    return { success: true, message: "Successfully connected to Google." };
  } catch (error: any) {
    console.error("[Google Callback] FAILED:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to retrieve access tokens from Google.");
  }
});

// This new helper function parses inline markdown like **bold** and *italic*
function parseInlineMarkdown(text: string): any[] {
  const richText: any[] = [];
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(p => p);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      richText.push({
        type: "text",
        text: { content: part.slice(2, -2) },
        annotations: { bold: true },
      });
    } else if (part.startsWith("*") && part.endsWith("*")) {
      richText.push({
        type: "text",
        text: { content: part.slice(1, -1) },
        annotations: { italic: true },
      });
    } else {
      richText.push({
        type: "text",
        text: { content: part },
      });
    }
  }
  return richText;
}

// This is the updated main function that now USES the inline parser
function markdownToNotionBlocks(markdown: string): any[] {
  if (!markdown) return [];
  const blocks: any[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === "") continue;

    if (trimmedLine.startsWith("# ")) {
      blocks.push({
        object: "block", type: "heading_1",
        heading_1: { rich_text: parseInlineMarkdown(trimmedLine.substring(2)) },
      });
    } else if (trimmedLine.startsWith("## ")) {
      blocks.push({
        object: "block", type: "heading_2",
        heading_2: { rich_text: parseInlineMarkdown(trimmedLine.substring(3)) },
      });
    } else if (trimmedLine.startsWith("### ")) {
      blocks.push({
        object: "block", type: "heading_3",
        heading_3: { rich_text: parseInlineMarkdown(trimmedLine.substring(4)) },
      });
    } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      blocks.push({
        object: "block", type: "bulleted_list_item",
        bulleted_list_item: { rich_text: parseInlineMarkdown(trimmedLine.substring(2)) },
      });
    } else if (trimmedLine.startsWith("- [ ] ")) {
      blocks.push({
        object: "block", type: "to_do",
        to_do: { rich_text: parseInlineMarkdown(trimmedLine.substring(6)), checked: false },
      });
    } else if (trimmedLine.startsWith("- [x] ")) {
      blocks.push({
        object: "block", type: "to_do",
        to_do: { rich_text: parseInlineMarkdown(trimmedLine.substring(6)), checked: true },
      });
    } else {
      blocks.push({
        object: "block", type: "paragraph",
        paragraph: { rich_text: parseInlineMarkdown(trimmedLine) },
      });
    }
  }
  return blocks;
}

const ELEVENLABS_API_BASE_URL = "https://api.elevenlabs.io/v1";

interface CheckoutData {
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export const createStripeCheckoutSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }

  const data = request.data;
  const context = request;
  const key = stripeSecretKey.value();
  if (!key) {
    throw new HttpsError("internal", "Stripe secret key is not set.");
  }

  const userId = context.auth!.uid;
  const userEmail = context.auth!.token.email;
  if (typeof data !== "object" || data === null) {
    throw new HttpsError("invalid-argument", "Request data must be an object.");
  }
  const checkoutData = data as CheckoutData;
  const { priceId, successUrl, cancelUrl } = checkoutData;
  if (!priceId || !successUrl || !cancelUrl) {
    throw new HttpsError("invalid-argument", "Required params missing.");
  }
  if (!userEmail) {
    throw new HttpsError("internal", "User email missing.");
  }
  const stripe = new Stripe(key, { apiVersion: "2024-04-10", typescript: true });
  let purchasedTier: "pro" | "premium" | undefined;
  const premiumYearlyLiveId = "price_1RgUEnIdgEonJvEbAhkfqVPd";
  const premiumMonthlyLiveId = "price_1RgULrIdgEonJvEbOM5n608H";
  const proYearlyLiveId = "price_1RgUI7IdgEonJvEbshTziusz";
  const proMonthlyLiveId = "price_1RUFTSIdgEonJvEbDIcAvUQ6";
  if ([premiumYearlyLiveId, premiumMonthlyLiveId].includes(priceId)) {
    purchasedTier = "premium";
  } else if ([proYearlyLiveId, proMonthlyLiveId].includes(priceId)) {
    purchasedTier = "pro";
  }
  if (!purchasedTier) {
    throw new HttpsError("internal", "Unknown sub tier.");
  }
  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();
    let stripeCustomerId = userDoc.data()?.stripeCustomerId as string | undefined;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail, name: context.auth!.token.name || undefined, metadata: { firebaseUID: userId }
      });
      stripeCustomerId = customer.id;
      await userRef.set({ stripeCustomerId }, { merge: true });
    }
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription", customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { firebaseUID: userId, purchasedTier: purchasedTier },
      success_url: successUrl, cancel_url: cancelUrl,
    };
    const session = await stripe.checkout.sessions.create(sessionOptions);
    return { sessionId: session.id, sessionUrl: session.url };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Stripe communication error.";
    throw new HttpsError("internal", `Stripe error: ${errorMessage}`);
  }
});

// ---------- TASKMASTER LIVE API ENDPOINTS ----------

/**
 * Creates an ephemeral token for secure client-side TaskMaster Live API access
 * Enhanced for Live API with custom system instructions and session config
 */
export const createTaskMasterEphemeralToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email;

  // Determine user tier for rate limiting
  let userTier: UserTier = "basic";
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as any;
      if (userData.premiumAwardedUntil && userData.premiumAwardedUntil.toDate() > new Date()) {
        userTier = "premium";
      } else if (
        userData.subscriptionStatus === "active" &&
        (userData.activeTier === "pro" || userData.activeTier === "premium")
      ) {
        userTier = userData.activeTier;
      } else if (email) {
        const e = email.toLowerCase();
        if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
        else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
      }
    } else if (email) {
      const e = email.toLowerCase();
      if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
      else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
    }
  } catch (error) {
    console.error("Error checking user tier for ephemeral token:", error);
  }

  // Apply rate limiting for Live API token requests
  if (!checkServerRateLimit(uid, userTier, 'api', 60 * 1000)) { // 1 minute window
    const limit = RATE_LIMITS.api[userTier];
    throw new HttpsError("resource-exhausted", `Rate limit exceeded. You can request ${limit} tokens per minute.`);
  }

  const key = (userTier === "pro" || userTier === "premium") ? taskMasterApiKeyPaid.value() : taskMasterApiKeyFree.value();
  if (!key) {
    throw new HttpsError("internal", "Server configuration error: API key is missing.");
  }

  try {
    const now = new Date();
    const expireTime = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutes from now
    const newSessionExpireTime = new Date(now.getTime() + (1 * 60 * 1000)); // 1 minute from now

    const tokenRequest = {
      uses: 1,
      expire_time: expireTime.toISOString(),
      new_session_expire_time: newSessionExpireTime.toISOString(),
    };

    const response = await fetch("https://generativelanguage.googleapis.com/v1alpha/authTokens?key=" + key, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Ephemeral token creation failed:", errorData);
      throw new HttpsError("internal", "Failed to create ephemeral token");
    }

    const tokenData = await response.json();
    
    return {
      token: tokenData.name, // This is the ephemeral token
      expireTime: expireTime.toISOString(),
      userTier: userTier,
    };
  } catch (error: any) {
    console.error("Error creating ephemeral token:", error);
    throw new HttpsError("internal", sanitizeErrorMessage(error) || "Failed to create ephemeral token");
  }
});

/**
 * Creates a TaskMaster Live API ephemeral token specifically for voice/video chat
 * with custom system instructions and session configuration
 */
export const createTaskMasterLiveToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email;
  const { systemInstruction, model: requestedModel } = request.data || {};

  // Determine user tier for rate limiting and model selection
  let userTier: UserTier = "basic";
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as any;
      if (userData.premiumAwardedUntil && userData.premiumAwardedUntil.toDate() > new Date()) {
        userTier = "premium";
      } else if (
        userData.subscriptionStatus === "active" &&
        (userData.activeTier === "pro" || userData.activeTier === "premium")
      ) {
        userTier = userData.activeTier;
      } else if (email) {
        const e = email.toLowerCase();
        if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
        else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
      }
    } else if (email) {
      const e = email.toLowerCase();
      if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
      else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
    }
  } catch (error) {
    console.error("Error checking user tier for Live API token:", error);
  }

  // Apply rate limiting for Live API token requests
  if (!checkServerRateLimit(uid, userTier, 'api', 60 * 1000)) { // 1 minute window
    const limit = RATE_LIMITS.api[userTier];
    throw new HttpsError("resource-exhausted", `Rate limit exceeded. You can request ${limit} tokens per minute.`);
  }

  // Select appropriate API key based on user tier
  const key = (userTier === "pro" || userTier === "premium") ? taskMasterApiKeyPaid.value() : taskMasterApiKeyFree.value();
  if (!key) {
    throw new HttpsError("internal", "Server configuration error: API key is missing.");
  }

  // Select model based on user tier and request with strict validation
  const ALLOWED_LIVE_MODELS = [
    "gemini-live-2.5-flash-preview",
    "gemini-2.5-flash-preview-native-audio-dialog",
    "gemini-2.0-flash-live-001"
  ];
  
  let selectedModel = requestedModel;
  
  // SECURITY: Validate requested model against whitelist
  if (selectedModel && !ALLOWED_LIVE_MODELS.includes(selectedModel)) {
    console.warn(`Rejected unauthorized model request: ${selectedModel} from user ${uid}`);
    selectedModel = undefined; // Force fallback to default
  }
  
  if (!selectedModel) {
    if (userTier === "premium") {
      selectedModel = "gemini-2.5-flash-preview-native-audio-dialog"; // Native audio for premium
    } else {
      selectedModel = "gemini-live-2.5-flash-preview"; // Half-cascade for basic/pro
    }
  }

  // Default system instruction for TaskMaster AI - use provided instruction or fallback
  const defaultSystemInstruction = systemInstruction || 
    "You are TaskMaster AI, a helpful study assistant with voice capabilities. " +
    "Speak in a friendly, conversational tone. Keep responses concise but informative. " +
    "You can help with studying, note-taking, research, and productivity tasks.";

  try {
    const now = new Date();
    const expireTime = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutes from now

    // TEMPORARY FIX: Use API key directly but with monitoring
    // TODO: Implement proper ephemeral tokens when Google fixes their API
    console.warn(`LIVE API DIRECT ACCESS: User ${uid} (${userTier}) using ${selectedModel} - implement ephemeral tokens ASAP`);
    
    // SECURITY: Log Live API token creation for monitoring
    trackModelUsage(selectedModel, uid);

    return {
      token: key, // TEMPORARY: Direct API key until ephemeral tokens work
      model: selectedModel,
      expireTime: expireTime.toISOString(),
      userTier: userTier,
      systemInstruction: defaultSystemInstruction,
    };
  } catch (error: any) {
    console.error("Error creating TaskMaster Live token:", error);
    throw new HttpsError("internal", sanitizeErrorMessage(error) || "Failed to create TaskMaster Live token");
  }
});

/**
 * Server-side Live API session proxy for enhanced security
 */
export const taskMasterLiveProxy = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const { sessionConfig } = request.data;
  const uid = request.auth.uid;
  const email = request.auth.token.email;

  // Determine user tier
  let userTier: UserTier = "basic";
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data() as any;
      if (userData.premiumAwardedUntil && userData.premiumAwardedUntil.toDate() > new Date()) {
        userTier = "premium";
      } else if (
        userData.subscriptionStatus === "active" &&
        (userData.activeTier === "pro" || userData.activeTier === "premium")
      ) {
        userTier = userData.activeTier;
      } else if (email) {
        const e = email.toLowerCase();
        if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
        else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
      }
    } else if (email) {
      const e = email.toLowerCase();
      if (PREMIUM_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "premium";
      else if (PRO_EMAILS.map(x => x.toLowerCase()).includes(e)) userTier = "pro";
    }
  } catch (error) {
    console.error("Error checking user tier for live proxy:", error);
  }

  // Apply rate limiting
  if (!checkServerRateLimit(uid, userTier, 'chat', 60 * 1000)) {
    const limit = RATE_LIMITS.chat[userTier];
    throw new HttpsError("resource-exhausted", `Rate limit exceeded. You can start ${limit} voice sessions per minute.`);
  }

  const key = (userTier === "pro" || userTier === "premium") ? taskMasterApiKeyPaid.value() : taskMasterApiKeyFree.value();
  if (!key) {
    throw new HttpsError("internal", "Server configuration error: API key is missing.");
  }

  // Default to half-cascade model for better production reliability
  const model = userTier === "premium" ? "gemini-2.5-flash-preview-native-audio-dialog" : "gemini-live-2.5-flash-preview";

  const defaultConfig = {
    response_modalities: ["AUDIO"],
    speech_config: {
      voice_config: {
        prebuilt_voice_config: {
          voice_name: userTier === "premium" ? "Aoede" : "Puck"
        }
      }
    },
    system_instruction: "You are a helpful AI assistant named TaskMaster with voice capabilities. Respond naturally and conversationally.",
    ...sessionConfig
  };

  return {
    model: model,
    config: defaultConfig,
    apiKey: key,
    userTier: userTier,
  };
});

export const createStripePortalSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }

  const userId = request.auth!.uid;
  const key = stripeSecretKey.value();
  if (!key) {
    throw new HttpsError("internal", "Stripe secret key is not set.");
  }
  let stripeCustomerId: string | undefined;
  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();
    stripeCustomerId = userDoc.data()?.stripeCustomerId as string | undefined;
    if (!stripeCustomerId) {
      throw new HttpsError("not-found", "Sub details missing.");
    }
  } catch (error) {
    throw new HttpsError("internal", "Could not get sub details.");
  }
  const stripe = new Stripe(key, { apiVersion: "2024-04-10", typescript: true });
  try {
    const isProduction = process.env.GCLOUD_PROJECT === "deepworkai-c3419";
    const returnUrl = isProduction ? "https://www.taskmaster.one/settings" : "http://localhost:5173/settings";
    const portalSession = await stripe.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: returnUrl });
    return { portalUrl: portalSession.url };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Could not create billing portal session.";
    throw new HttpsError("internal", errorMessage);
  }
});

export const stripeWebhookHandler = onRequest(async (request, response) => {
  const key = stripeSecretKey.value();
  const secret = stripeWebhookSecret.value();
  if (!key || !secret) {
    response.status(500).send("Server configuration error.");
    return;
  }
  const stripe = new Stripe(key, { apiVersion: "2024-04-10", typescript: true });
  const sig = request.headers["stripe-signature"] as string;
  const rawBody = request.rawBody;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature error.";
    response.status(400).send(`Webhook Error: ${message}`);
    return;
  }
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { firebaseUID, purchasedTier } = session.metadata || {};
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;
        if (!firebaseUID || !purchasedTier || !stripeCustomerId || !stripeSubscriptionId) {
          break;
        }
        await db.collection("users").doc(firebaseUID).set({
          stripeCustomerId, stripeSubscriptionId,
          activeTier: purchasedTier, subscriptionStatus: "active",
          tierActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const status = sub.status;
        const custId = sub.customer as string;
        const userQuery = db.collection("users").where("stripeCustomerId", "==", custId).limit(1);
        const userSnap = await userQuery.get();
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          const isActive = status === "active" || status === "trialing";
          await userDoc.ref.update({
            subscriptionStatus: status,
            activeTier: isActive ? userDoc.data().activeTier : "basic",
          });
        }
        break;
      }
    }
    response.status(200).send({ received: true });
  } catch (error) {
    response.status(500).send({ error: "Webhook handler failed." });
  }
});

interface ProcessedPodcastSegment { speakerId: string | null; text: string; elevenLabsVoiceId?: string; }
interface TimedPodcastSegment { speakerId: string | null; url: string; text: string; startTime: number; endTime: number; }

const PODCAST_QUEUE_NAME = "podcastworker";

export const triggerPodcastGeneration = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const { noteId, segments, settings } = request.data;
  const userId = request.auth.uid;
  if (!noteId || !segments || !Array.isArray(segments) || segments.length === 0) {
    throw new HttpsError("invalid-argument", "Missing required data: noteId and segments.");
  }

  // Apply rate limiting for podcast generation (expensive operation)
  const userDoc = await db.collection("users").doc(userId).get();
  let userTier: UserTier = "basic";
  
  if (userDoc.exists) {
    const userData = userDoc.data() as any;
    if (userData.premiumAwardedUntil && userData.premiumAwardedUntil.toDate() > new Date()) {
      userTier = "premium";
    } else if (userData.subscriptionStatus === "active" && (userData.activeTier === "pro" || userData.activeTier === "premium")) {
      userTier = userData.activeTier;
    }
  }
  
  if (!checkServerRateLimit(userId, userTier, 'notes', 60 * 60 * 1000)) { // 1 hour window
    const limit = RATE_LIMITS.notes[userTier];
    throw new HttpsError("resource-exhausted", `Podcast generation limit exceeded. You can create ${limit} podcasts per hour.`);
  }
  // Validate and sanitize settings before storing
  const validatedSettings = {
    language: (settings?.language && typeof settings.language === 'string') ? settings.language : 'en',
    speaker1Id: (settings?.speaker1Id && typeof settings.speaker1Id === 'string') ? settings.speaker1Id : null,
    speaker2Id: (settings?.speaker2Id && typeof settings.speaker2Id === 'string') ? settings.speaker2Id : null,
    length: ['short', 'medium', 'long'].includes(settings?.length) ? settings.length : 'short',
    instructions: (settings?.instructions && typeof settings.instructions === 'string') ? settings.instructions : ''
  };

  const jobRef = db.collection("podcastJobs").doc();
  await jobRef.set({
    userId,
    noteId,
    status: "queued",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    segments: Array.isArray(segments) ? segments : [],
    settings: validatedSettings,
  });
  const queue = getFunctions().taskQueue(PODCAST_QUEUE_NAME);
  await queue.enqueue({ jobId: jobRef.id });
  console.info(`[V1 Trigger] Queued job ${jobRef.id} for note ${noteId}.`);
  return { jobId: jobRef.id, message: "Podcast generation has been queued successfully." };
});

export const podcastworker = tasks.onTaskDispatched({
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 60 },
  rateLimits: { maxConcurrentDispatches: 2 },
  timeoutSeconds: 3600,
}, async (request) => {
  const { jobId } = request.data as { jobId: string };
  if (!jobId) { console.error("[V2 Worker] Received task without a jobId."); return; }
  const jobRef = db.collection("podcastJobs").doc(jobId);
  try {
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) { console.error(`[V2 Worker] Job ${jobId} not found in Firestore.`); return; }
    const jobData = jobDoc.data()!;
    await jobRef.update({ status: "processing", startedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.info(`[V2 Worker] Started processing job ${jobId}. This can take up to 60 minutes.`);
    const audioResult = await generateAndCombineAudio(jobData.segments, jobData.userId);
    // Create podcast data with proper validation and defaults
    const validatedSettings = {
      language: (jobData.settings?.language && typeof jobData.settings.language === 'string') ? jobData.settings.language : 'en',
      speaker1Id: (jobData.settings?.speaker1Id && typeof jobData.settings.speaker1Id === 'string') ? jobData.settings.speaker1Id : null,
      speaker2Id: (jobData.settings?.speaker2Id && typeof jobData.settings.speaker2Id === 'string') ? jobData.settings.speaker2Id : null,
      length: ['short', 'medium', 'long'].includes(jobData.settings?.length) ? jobData.settings.length : 'short',
      instructions: (jobData.settings?.instructions && typeof jobData.settings.instructions === 'string') ? jobData.settings.instructions : ''
    };

    const newPodcastData = {
      id: admin.firestore.Timestamp.now().toMillis().toString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      settings: validatedSettings,
      segments: audioResult.audioSegmentUrls || [],
      combinedUrl: audioResult.combinedUrl || '',
      totalDuration: typeof audioResult.totalDuration === 'number' ? audioResult.totalDuration : 0,
    };
    const noteRef = db.collection("notes").doc(jobData.noteId);
    await noteRef.update({ podcasts: admin.firestore.FieldValue.arrayUnion(newPodcastData) });
    await jobRef.update({ status: "completed", finishedAt: admin.firestore.FieldValue.serverTimestamp(), result: newPodcastData });
    console.info(`[V2 Worker] Successfully completed job ${jobId}`);
  } catch (error: any) {
    console.error(`[V2 Worker] Error processing job ${jobId}:`, error);
    await jobRef.update({ status: "failed", error: error.message, finishedAt: admin.firestore.FieldValue.serverTimestamp() });
    throw error;
  }
});

async function generateAndCombineAudio(segments: ProcessedPodcastSegment[], userId: string) {
  const mm = await import("music-metadata");
  const ffmpeg = (await import("fluent-ffmpeg")).default;
  const ffmpegStaticPath = (await import("ffmpeg-static")).default;

  if (ffmpegStaticPath) {
    ffmpeg.setFfmpegPath(ffmpegStaticPath as unknown as string);
  } else {
    throw new Error("FFMPEG static binary not found; cannot process audio.");
  }
  const key = elevenlabsApiKey.value();
  if (!key) { throw new Error("Server config error: ElevenLabs API key is not set."); }
  if (!segments || segments.length === 0) { throw new Error("No text segments provided for audio generation."); }
  const bucket = storage.bucket();
  const tempDir = os.tmpdir();
  const sessionSubDir = `podcast_${userId}_${Date.now()}`;
  const sessionTempPath = path.join(tempDir, sessionSubDir);
  fs.mkdirSync(sessionTempPath, { recursive: true });
  const segmentAudioData: { buffer: Buffer, duration: number, originalSegment: ProcessedPodcastSegment }[] = [];
  try {
    for (const [index, segment] of segments.entries()) {
      const voiceId = segment.elevenLabsVoiceId;
      if (!voiceId || !segment.text?.trim()) { continue; }
      try {
        const ttsUrl = `${ELEVENLABS_API_BASE_URL}/text-to-speech/${voiceId}`;
        const response = await fetch(ttsUrl, {
          method: "POST", headers: { "Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": key },
          body: JSON.stringify({ text: segment.text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`ElevenLabs API error for segment ${index}: ${response.status}`, { errorBody });
          throw new Error(`ElevenLabs API failed for segment ${index}.`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const metadata = await mm.parseBuffer(buffer, "audio/mpeg");
        const duration = metadata.format.duration ?? 0;
        segmentAudioData[index] = { buffer, duration, originalSegment: segment };
        await new Promise((resolve) => setTimeout(resolve, 350));
      } catch (err) {
        console.error(`Failed processing segment ${index}.`, err);
        if (err instanceof Error) { throw err; }
        throw new Error(`An unknown error occurred while processing segment ${index}.`);
      }
    }
    const concatListPath = path.join(sessionTempPath, "concat.txt");
    let concatContent = "";
    for (let i = 0; i < segmentAudioData.length; i++) {
      if (segmentAudioData[i]) {
        const tempFilePath = path.join(sessionTempPath, `segment_${i}.mp3`);
        fs.writeFileSync(tempFilePath, segmentAudioData[i].buffer);
        concatContent += `file '${tempFilePath.replace(/'/g, "'\\''")}'\n`;
      }
    }
    fs.writeFileSync(concatListPath, concatContent);
    const combinedFilePath = path.join(sessionTempPath, "combined.mp3");
    await new Promise<void>((resolve, reject) => {
      ffmpeg().input(concatListPath).inputOptions(["-f concat", "-safe 0"]).outputOptions("-c copy")
        .save(combinedFilePath)
        .on("end", () => resolve())
        .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)));
    });
    let currentTime = 0;
    const uploadPromises = segmentAudioData.map(async (data, index) => {
      if (!data) return null;
      const startTime = currentTime;
      const endTime = startTime + data.duration;
      currentTime += data.duration;
      const gcsFileName = `podcast_audio/${userId}/${Date.now()}_segment_${index}.mp3`;
      const file = bucket.file(gcsFileName);
      await file.save(data.buffer, { metadata: { contentType: "audio/mpeg" } });
      const [url] = await file.getSignedUrl({ action: "read", expires: "03-09-2491" });
      return { ...data.originalSegment, url, startTime, endTime };
    });
    const combinedFileBuffer = fs.readFileSync(combinedFilePath);
    const gcsCombinedFileName = `podcast_audio/${userId}/${Date.now()}_combined.mp3`;
    const combinedFile = bucket.file(gcsCombinedFileName);
    await combinedFile.save(combinedFileBuffer, { metadata: { contentType: "audio/mpeg" } });
    const [combinedUrl] = await combinedFile.getSignedUrl({ action: "read", expires: "03-09-2491" });
    const finalSegments = (await Promise.all(uploadPromises)).filter(s => s !== null) as TimedPodcastSegment[];
    return {
      audioSegmentUrls: finalSegments,
      combinedUrl,
      totalDuration: currentTime,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown server error.";
    console.error("Podcast generation failed:", { error: errorMessage });
    throw new Error(errorMessage);
  } finally {
    fs.rm(sessionTempPath, { recursive: true, force: true }, (err) => {
      if (err) console.error(`Failed to clean up temp dir: ${sessionTempPath}`, err);
    });
  }
}

// CORRECTED AND ROBUST notionOAuthCallback
export const notionOAuthCallback = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const data = request.data;
  const uid = request.auth.uid;

  const { code, redirectUri } = data;
  if (!code || !redirectUri) {
    throw new HttpsError("invalid-argument", "The 'code' and 'redirectUri' must be provided.");
  }

  const clientId = notionClientId.value();
  const clientSecret = notionClientSecret.value();
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ "grant_type": "authorization_code", "code": code, "redirect_uri": redirectUri }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("[Notion Callback] Notion API returned an error:", errorBody);
      throw new HttpsError("internal", `Notion API Error: ${errorBody.error_description || errorBody.error}.`);
    }

    const notionData = await response.json();
    const updateData = { notionAccessData: notionData };

    try {
      await admin.firestore().collection("users").doc(uid).update(updateData);
    } catch (updateError: any) {
      if (updateError.code === 5 || updateError.toString().includes("NOT_FOUND")) {
        console.warn(`[Notion Callback] Document for user ${uid} not found. Attempting to CREATE document with SET...`);
        await admin.firestore().collection("users").doc(uid).set(updateData);
      } else {
        throw updateError;
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error("[Notion Callback] An unexpected error occurred:", error);
    if (error.code) { // Re-throw Firebase HttpsError
      throw error;
    }
    throw new HttpsError("unknown", "An unknown server error occurred.", sanitizeErrorMessage(error));
  }
});

export const disconnectNotion = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const uid = request.auth.uid;

  await admin.firestore().collection("users").doc(uid).update({
    notionAccessData: admin.firestore.FieldValue.delete(),
  });

  return { success: true };
});

// Helper function to convert Notion blocks to a simple markdown string
function notionBlocksToMarkdown(blocks: any[]): string {
  let markdown = "";
  blocks.forEach((block, index) => {
    const type = block.type;

    if (type === "table" && block.has_children) {
      const headerRow = blocks[index + 1];
      if (block.table.has_column_header && headerRow && headerRow.type === "table_row") {
        const headerCells = headerRow.table_row.cells.map((cell: any[]) => cell.map(t => t.plain_text).join("")).join(" | ");
        markdown += `| ${headerCells} |\n`;
        markdown += `| ${headerRow.table_row.cells.map(() => "---").join(" | ")} |\n`;
      }
    } else if (type === "table_row" && block.table_row.cells) {
      const isHeaderRow = block.id && (blocks[index - 1]?.table?.has_column_header) && blocks[index - 1]?.id === block.parent?.block_id;
      if (isHeaderRow && block.parent.type === "block_id" && blocks[index - 1]?.type === "table") {
        // skip header row (already handled)
      } else {
        const rowText = block.table_row.cells.map((cell: any[]) => {
          return cell.map((textPart: any) => textPart.plain_text).join("");
        }).join(" | ");
        markdown += `| ${rowText} |\n`;
      }
    } else if (type === "child_page") {
      markdown += `\n[Page: ${block.child_page.title}]\n`;
    } else if (block[type] && block[type].rich_text) {
      const text = block[type].rich_text.map((t: any) => t.plain_text).join("");
      switch (type) {
        case "heading_1":
          markdown += `# ${text}\n`;
          break;
        case "heading_2":
          markdown += `## ${text}\n`;
          break;
        case "heading_3":
          markdown += `### ${text}\n`;
          break;
        case "bulleted_list_item":
        case "numbered_list_item":
          markdown += `- ${text}\n`;
          break;
        case "to_do":
          markdown += `- [${block.to_do.checked ? "x" : " "}] ${text}\n`;
          break;
        case "quote":
          markdown += `> ${text}\n`;
          break;
        case "code":
          markdown += `\`\`\`${block.code.language}\n${text}\n\`\`\`\n`;
          break;
        case "paragraph":
          if (text) {
            markdown += `${text}\n\n`;
          }
          break;
        default:
          if (text) {
            markdown += `${text}\n`;
          }
          break;
      }
    }
  });
  return markdown.trim();
}

// This new helper function contains all the logic for executing a single Notion API call.
const executeSingleNotionAction = async (action: string, payload: any, headers: any): Promise<any> => {

  const findPageByTitle = async (title: string): Promise<any> => {
    const searchResponse = await fetch("https://api.notion.com/v1/search", {
      method: "POST", headers, body: JSON.stringify({ query: title, filter: { value: "page", property: "object" } }),
    });
    if (!searchResponse.ok) {
      const errBody = await searchResponse.json();
      throw new Error(`Failed to search for page: ${errBody.message || "Unknown error"}`);
    }
    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      throw new HttpsError("not-found", `Sorry, I couldn't find a page titled "${title}".`);
    }

    const exactMatch = searchData.results.find((p: any) =>
      p.properties?.title?.title?.[0]?.plain_text?.toLowerCase() === title.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch;
    }

    if (searchData.results.length > 1) {
      const pageTitles = searchData.results.map((p: any) => `"${p.properties?.title?.title?.[0]?.plain_text || "Untitled"}"`).join(", ");
      throw new HttpsError(
        "failed-precondition",
        `I found multiple pages containing "${title}" (${pageTitles}). Please be more specific or use the exact title.`
      );
    }
    return searchData.results[0];
  };

  switch (action) {
    case "searchNotion": {
      const response = await fetch("https://api.notion.com/v1/search", {
        method: "POST", headers, body: JSON.stringify({ query: payload.query }),
      });
      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(`Notion API Error: ${errBody.message || response.statusText}`);
      }
      const data = await response.json();
      if (data.results && Array.isArray(data.results)) {
        data.results = data.results.filter((item: any) => {
          let title = item.object === "page" ? item.properties?.title?.title?.[0]?.plain_text : item.title?.[0]?.plain_text;
          return title && title.trim().toLowerCase() !== "untitled";
        });
      }
      return data;
    }

    case "findAndReadPageContent": {
      const { title } = payload;
      if (!title) throw new HttpsError("invalid-argument", "A 'title' is required.");
      const page = await findPageByTitle(title);

      // paginate to read all blocks
      let allBlocks: any[] = [];
      let hasMore = true;
      let startCursor: string | undefined = undefined;

      while (hasMore) {
        const url = new URL(`https://api.notion.com/v1/blocks/${page.id}/children`);
        if (startCursor) url.searchParams.append("start_cursor", startCursor);
        url.searchParams.append("page_size", "100");

        const blocksResponse = await fetch(url.toString(), { headers });
        if (!blocksResponse.ok) {
          const errBody = await blocksResponse.json();
          console.error(`Notion API Error fetching blocks for page ${page.id}:`, errBody);
          throw new Error(`Failed to fetch page content: ${errBody.message || "Unknown error"}`);
        }
        const blocksData = await blocksResponse.json();

        for (const block of blocksData.results) {
          allBlocks.push(block);
          if (block.type === "table" && block.has_children) {
            let tableHasMore = true;
            let tableStartCursor: string | undefined = undefined;
            while (tableHasMore) {
              const tableUrl = new URL(`https://api.notion.com/v1/blocks/${block.id}/children`);
              if (tableStartCursor) tableUrl.searchParams.append("start_cursor", tableStartCursor);
              const tableRowsResponse = await fetch(tableUrl.toString(), { headers });
              if (tableRowsResponse.ok) {
                const tableRowsData = await tableRowsResponse.json();
                allBlocks.push(...tableRowsData.results);
                tableHasMore = tableRowsData.has_more;
                tableStartCursor = tableRowsData.next_cursor;
              } else {
                console.warn(`Could not fetch rows for table block ${block.id}`);
                tableHasMore = false;
              }
            }
          }
        }

        hasMore = blocksData.has_more;
        startCursor = blocksData.next_cursor;
      }

      return {
        ...page,
        markdownContent: notionBlocksToMarkdown(allBlocks) || "This page is empty or contains only unsupported content.",
        pageTitle: page.properties?.title?.title?.[0]?.plain_text || "Untitled",
      };
    }

    case "createNotionPage": {
      const { title, content, parent_page_id } = payload;
      if (!title) {
        throw new HttpsError("invalid-argument", "A 'title' is required.");
      }

      let final_parent_id = parent_page_id;

      if (!final_parent_id) {
        const searchResponse = await fetch("https://api.notion.com/v1/search", {
          method: "POST", headers, body: JSON.stringify({ page_size: 1, filter: { value: "page", property: "object" } }),
        });
        if (!searchResponse.ok) throw new Error("Could not search for a default parent page.");
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          final_parent_id = searchData.results[0].id;
        } else {
          throw new HttpsError("failed-precondition", "To create a top-level page, please share at least one page with this integration first.");
        }
      }

      const body = {
        parent: { page_id: final_parent_id },
        properties: { title: { title: [{ text: { content: title } }] } },
        children: markdownToNotionBlocks(content || ""),
      };
      const response = await fetch("https://api.notion.com/v1/pages", { method: "POST", headers, body: JSON.stringify(body) });
      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(`Notion API Error creating page: ${errBody.message || errBody.code}`);
      }
      return await response.json();
    }

    case "findAndDeletePage": {
      const { title } = payload;
      if (!title) throw new HttpsError("invalid-argument", "A title is required.");
      const page = await findPageByTitle(title);
      const deleteResponse = await fetch(`https://api.notion.com/v1/pages/${page.id}`, { method: "PATCH", headers, body: JSON.stringify({ archived: true }) });
      if (!deleteResponse.ok) throw new Error("Failed to delete (archive) the page.");
      return { success: true, title: page.properties.title?.title?.[0]?.plain_text || title };
    }

    case "findAndAppendToPage": {
      const { title, content } = payload;
      if (!title || content === undefined) throw new HttpsError("invalid-argument", "title and content are required.");
      const page = await findPageByTitle(title);
      const newBlocks = markdownToNotionBlocks(content);
      if (newBlocks.length > 0) {
        const appendResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, { method: "PATCH", headers, body: JSON.stringify({ children: newBlocks }) });
        if (!appendResponse.ok) throw new Error("Failed to append content.");
      }
      return page;
    }

    case "findAndReplaceInPage": {
      const { title, findText, replaceText } = payload;
      if (!title || !findText || replaceText === undefined) throw new HttpsError("invalid-argument", "title, findText, and replaceText are required.");
      const page = await findPageByTitle(title);
      const listBlocksResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, { headers });
      if (!listBlocksResponse.ok) throw new Error("Could not retrieve page content.");
      const { results: existingBlocks } = await listBlocksResponse.json();
      let blockUpdated = false;
      for (const block of existingBlocks) {
        const blockType = block.type;
        const richTextArray = block[blockType]?.rich_text;
        if (richTextArray?.length > 0) {
          const currentText = richTextArray.map((rt: any) => rt.plain_text).join("");
          if (currentText.trim() === findText.trim()) {
            const newContent = currentText.replace(findText, replaceText);
            const updatedBlockPayload = { [blockType]: { rich_text: parseInlineMarkdown(newContent) } };
            const updateResponse = await fetch(`https://api.notion.com/v1/blocks/${block.id}`, { method: "PATCH", headers, body: JSON.stringify(updatedBlockPayload) });
            if (!updateResponse.ok) throw new Error("Failed to update block content.");
            blockUpdated = true;
            break;
          }
        }
      }
      if (!blockUpdated) throw new HttpsError("not-found", `Sorry, I couldn't find the text "${findText}" on the page.`);
      return page;
    }

    case "findAndInsertAfter": {
      const { title, findText, contentToInsert } = payload;
      if (!title || !findText || !contentToInsert) throw new HttpsError("invalid-argument", "title, findText, and contentToInsert are required.");
      const page = await findPageByTitle(title);
      const listBlocksResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, { headers });
      if (!listBlocksResponse.ok) throw new Error("Could not retrieve page content.");
      const { results: existingBlocks } = await listBlocksResponse.json();
      let afterBlockId: string | undefined = undefined;
      let foundTarget = false;
      for (const block of existingBlocks) {
        const blockType = block.type;
        const richTextArray = block[blockType]?.rich_text;
        if (richTextArray?.length > 0) {
          const currentText = richTextArray.map((rt: any) => rt.plain_text).join("");
          if (currentText.trim() === findText.trim()) {
            afterBlockId = block.id;
            foundTarget = true;
            break;
          }
        }
      }
      if (!foundTarget) throw new HttpsError("not-found", `Sorry, I couldn't find the text "${findText}" to insert content after.`);
      const newBlocks = markdownToNotionBlocks(contentToInsert);
      if (newBlocks.length > 0) {
        const appendResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
          method: "PATCH", headers, body: JSON.stringify({ children: newBlocks, after: afterBlockId }),
        });
        if (!appendResponse.ok) throw new Error("Failed to insert new content.");
      }
      return page;
    }

    case "appendToNotionPage": {
      const { page_id, content } = payload;
      if (!page_id || content === undefined) throw new HttpsError("invalid-argument", "page_id and content are required.");
      const newBlocks = markdownToNotionBlocks(content);
      if (newBlocks.length > 0) {
        const appendResponse = await fetch(`https://api.notion.com/v1/blocks/${page_id}/children`, { method: "PATCH", headers, body: JSON.stringify({ children: newBlocks }) });
        if (!appendResponse.ok) throw new Error("Failed to append content.");
      }
      const pageResponse = await fetch(`https://api.notion.com/v1/pages/${page_id}`, { headers });
      if (!pageResponse.ok) {
        throw new Error("Content was appended, but failed to fetch the updated page object.");
      }
      return await pageResponse.json();
    }

    case "searchDatabases": {
      const response = await fetch("https://api.notion.com/v1/search", {
        method: "POST", 
        headers, 
        body: JSON.stringify({ 
          filter: { 
            value: "database", 
            property: "object" 
          },
          page_size: 50
        })
      });
      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(`Notion API Error: ${errBody.message || response.statusText}`);
      }
      const data = await response.json();
      return data;
    }

    case "queryDatabase": {
      const { database_id, filter, sorts, page_size } = payload;
      if (!database_id) throw new HttpsError("invalid-argument", "database_id is required.");
      
      const queryPayload: any = {
        page_size: page_size || 50
      };
      if (filter) queryPayload.filter = filter;
      if (sorts) queryPayload.sorts = sorts;

      const response = await fetch(`https://api.notion.com/v1/databases/${database_id}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify(queryPayload)
      });
      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(`Notion API Error: ${errBody.message || response.statusText}`);
      }
      return await response.json();
    }

    case "searchTasksAndGoals": {
      // Search for databases that might contain tasks or goals
      const dbResponse = await fetch("https://api.notion.com/v1/search", {
        method: "POST", 
        headers, 
        body: JSON.stringify({ 
          filter: { 
            value: "database", 
            property: "object" 
          },
          page_size: 50
        })
      });
      
      if (!dbResponse.ok) {
        const errBody = await dbResponse.json();
        throw new Error(`Notion API Error: ${errBody.message || dbResponse.statusText}`);
      }
      
      const databases = await dbResponse.json();
      const taskGoalDatabases = [];
      const allItems = [];
      
      // Look for databases that might contain tasks/todos/goals
      for (const db of databases.results || []) {
        const dbTitle = db.title?.[0]?.plain_text?.toLowerCase() || '';
        const isTaskLike = dbTitle.includes('task') || dbTitle.includes('todo') || 
                          dbTitle.includes('goal') || dbTitle.includes('project') ||
                          dbTitle.includes('action') || dbTitle.includes('item');
        
        if (isTaskLike) {
          taskGoalDatabases.push(db);
          
          // Query this database for items
          try {
            const queryResponse = await fetch(`https://api.notion.com/v1/databases/${db.id}/query`, {
              method: "POST",
              headers,
              body: JSON.stringify({ page_size: 25 })
            });
            
            if (queryResponse.ok) {
              const queryData = await queryResponse.json();
              const items = queryData.results?.map((item: any) => ({
                id: item.id,
                title: item.properties?.Name?.title?.[0]?.plain_text || 
                       item.properties?.Title?.title?.[0]?.plain_text ||
                       'Untitled',
                url: item.url,
                database: db.title?.[0]?.plain_text || 'Untitled Database',
                database_id: db.id,
                type: dbTitle.includes('goal') ? 'goal' : 'task',
                status: item.properties?.Status?.select?.name || 
                       item.properties?.Done?.checkbox ? 'completed' : 'active',
                created_time: item.created_time,
                last_edited_time: item.last_edited_time
              })) || [];
              
              allItems.push(...items);
            }
          } catch (queryError) {
            console.warn(`Failed to query database ${db.id}:`, queryError);
          }
        }
      }
      
      return {
        databases: taskGoalDatabases,
        items: allItems
      };
    }

    default:
      throw new HttpsError("invalid-argument", `Unknown Notion action provided: ${action}`);
  }
};

export const notionProxy = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { actions, action, payload } = request.data;

  const uid = request.auth.uid;
  const userDoc = await admin.firestore().collection("users").doc(uid).get();
  const notionAccessData = userDoc.data()?.notionAccessData;

  if (!notionAccessData || !notionAccessData.access_token) {
    throw new HttpsError("failed-precondition", "Notion is not connected for this user.");
  }

  const accessToken = notionAccessData.access_token;
  const NOTION_API_VERSION = "2022-06-28";
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_API_VERSION,
  };

  try {
    if (actions && Array.isArray(actions)) {
      const results = [];
      for (const individualAction of actions) {
        const result = await executeSingleNotionAction(individualAction.action, individualAction.payload, headers);
        results.push(result);
      }
      return results;
    } else if (action && payload) {
      return await executeSingleNotionAction(action, payload, headers);
    } else {
      throw new HttpsError("invalid-argument", "Request must include either a single 'action'/'payload' or a batch 'actions' array.");
    }
  } catch (error: any) {
    console.error(`Error in notionProxy:`, error);
    if (error.code && error.http) {
      throw error;
    }
    throw new HttpsError("internal", sanitizeErrorMessage(error) || "An error occurred while communicating with Notion.");
  }
});

export const disconnectGoogleService = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { service } = request.data;
  const uid = request.auth.uid;

  if (!service || (service !== "drive" && service !== "calendar")) {
    throw new HttpsError("invalid-argument", "A valid service ('drive' or 'calendar') is required.");
  }

  const userDocRef = admin.firestore().collection("users").doc(uid);
  const userDoc = await userDocRef.get();
  const tokens = (userDoc.data() as any)?.googleTokens; // Use the correct field name

  if (tokens && tokens.access_token) {
    const oAuth2Client = new google.auth.OAuth2(googleClientId.value(), googleClientSecret.value());
    try {
      await oAuth2Client.revokeToken(tokens.access_token);
    } catch (error: any) {
      console.warn(`Failed to revoke Google token for user ${uid}. This can happen if the token is already invalid.`, error.message);
    }
  }

  // Clear all Google-related data since they share the same OAuth token
  await userDocRef.update({
    googleTokens: admin.firestore.FieldValue.delete(),
    googleDriveConnected: false,
    googleCalendarConnected: false
  });

  return { success: true };
});

// --- Google Drive / Calendar helpers ---
async function executeDriveAction(drive: any, action: string, payload: any) {
  const visionClient = (google as any).vision("v1");

  const extractTextFromImage = async (buffer: Buffer): Promise<string> => {
    try {
      const response = await visionClient.images.annotate({
        auth: drive.auth,
        requestBody: {
          requests: [{
            image: { content: buffer.toString("base64") },
            features: [{ type: "TEXT_DETECTION" }],
          }],
        },
      });
      const annotation = response.data.responses?.[0]?.fullTextAnnotation;
      return annotation?.text || "No text could be extracted from the image.";
    } catch (error: any) {
      console.error("Google Vision API Error:", error.response?.data?.error || error.message);
      return "Sorry, I encountered an error trying to read the text from the image.";
    }
  };

  const getFileContent = async (fileId: string, mimeType?: string): Promise<string> => {
    if (mimeType?.includes("google-apps")) {
      const exportMimeType = mimeType.includes("spreadsheet") ? "text/csv" : "text/plain";
      const res = await drive.files.export({ fileId, mimeType: exportMimeType });
      return res.data as string;
    }
    const res = await drive.files.get({ fileId, alt: "media" });
    return res.data as string;
  };

  switch (action) {
    case "searchDrive": {
      const { query, folderId } = payload;
      if (!query) throw new HttpsError("invalid-argument", "A 'query' is required for searchDrive.");
      
      // Build search query with optional folder restriction
      let searchQuery = `name contains '${query}' and trashed = false`;
      if (folderId) {
        searchQuery = `name contains '${query}' and '${folderId}' in parents and trashed = false`;
      }
      
      const response = await drive.files.list({
        q: searchQuery,
        fields: "files(id, name, mimeType, webViewLink, iconLink, size, modifiedTime, createdTime, description)",
        pageSize: 50,
        orderBy: "folder,name"  // Show folders first, then files
      });
      return response.data;
    }

    case "findAndReadFile": {
      const { query } = payload;
      if (!query) throw new HttpsError("invalid-argument", "A 'query' is required for findAndReadFile.");
      
      // First, search for the file using multiple strategies
      // Escape single quotes in the query to prevent Google Drive API issues
      const escapedQuery = query.replace(/'/g, "\\'");
      
      let files: any[] = [];
      
      // Strategy 1: Exact name match
      try {
        const exactResponse = await drive.files.list({
          q: `name = '${escapedQuery}' and trashed = false`,
          fields: "files(id, name, mimeType, webViewLink, iconLink)",
          pageSize: 5,
        });
        files = exactResponse.data.files || [];
      } catch (error) {
      }
      
      // Strategy 2: Contains search if exact match fails
      if (files.length === 0) {
        try {
          const containsResponse = await drive.files.list({
            q: `name contains '${escapedQuery}' and trashed = false`,
            fields: "files(id, name, mimeType, webViewLink, iconLink)",
            pageSize: 10,
          });
          files = containsResponse.data.files || [];
        } catch (error) {
        }
      }
      
      // Strategy 3: Fuzzy search by splitting the query into keywords
      if (files.length === 0) {
        const keywords = query.split(/[\s\-_]+/).filter((word: string) => word.length > 2); // Split on spaces, hyphens, underscores
        if (keywords.length > 0) {
          try {
            const keywordQuery = keywords.map((keyword: string) => `name contains '${keyword.replace(/'/g, "\\'")}'`).join(' and ');
            const fuzzyResponse = await drive.files.list({
              q: `(${keywordQuery}) and trashed = false`,
              fields: "files(id, name, mimeType, webViewLink, iconLink)",
              pageSize: 10,
            });
            files = fuzzyResponse.data.files || [];
          } catch (error) {
          }
        }
      }
      
      if (files.length === 0) {
        throw new HttpsError("not-found", `No files found matching "${query}". Please check the filename or try listing your files first to see the exact names.`);
      }
      
      // Get the first file (best match)
      const file = files[0];
      const fileId = file.id!;
      const mimeType = file.mimeType!;
      const fileName = file.name || "Untitled File";

      
      // Now read the file content
      try {
        if (mimeType?.includes("google-apps")) {
          let exportMimeType = "text/plain";
          if (mimeType.includes("spreadsheet")) {
            exportMimeType = "text/csv";
          } else if (mimeType.includes("document")) {
          } else if (mimeType.includes("presentation")) {
          }
          
          const response = await drive.files.export({ fileId, mimeType: exportMimeType });
          return { name: fileName, content: response.data, searchResults: files };
        }
        
        if (mimeType === "application/pdf") {
        const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data as any);
        const data = await pdf(buffer);
        return { name: fileName, content: data.text || `No text found in ${fileName}.`, searchResults: files };
      }
      if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data as any);
        const { value } = await mammoth.extractRawText({ buffer });
        return { name: fileName, content: value, searchResults: files };
      }
      if (mimeType === "image/jpeg" || mimeType === "image/png") {
        const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data as any);
        const textContent = await extractTextFromImage(buffer);
        return { name: fileName, content: textContent, searchResults: files };
      }
      if (mimeType === "text/plain") {
        const res = await drive.files.get({ fileId, alt: "media" });
        return { name: fileName, content: res.data, searchResults: files };
      }
        return {
          name: fileName,
          content: `I can see the file "${fileName}", but I cannot read the content of this specific file type (${mimeType}). I can read Google Docs, Sheets, Slides, PDFs, Word Documents, and text from images.`,
          searchResults: files
        };
      } catch (readError: any) {
        console.error(`[findAndReadFile] Failed to read file content for "${fileName}":`, readError);
        throw new HttpsError("internal", `Failed to read file "${fileName}": ${readError.message || 'Unknown error during file reading'}`);
      }
    }

    case "listFilesAndFolders": {
      const { folderId } = payload;
      const query = folderId ? `'${folderId}' in parents and trashed = false` : "'root' in parents and trashed = false";
      const response = await drive.files.list({ 
        q: query, 
        fields: "files(id, name, mimeType, webViewLink, iconLink, size, modifiedTime, createdTime, description)", 
        pageSize: 50,
        orderBy: "folder,name"  // Show folders first, then files, both alphabetically
      });
      return response.data;
    }

    case "readDriveFile": {
      const { fileId, mimeType } = payload;
      if (!fileId) throw new HttpsError("invalid-argument", "A 'fileId' is required.");
      const { data: fileMeta } = await drive.files.get({ fileId, fields: "name" });
      const fileName = fileMeta.name || "Untitled File";

      if (mimeType?.includes("google-apps")) {
        let exportMimeType = "text/plain";
        if (mimeType.includes("spreadsheet")) exportMimeType = "text/csv";
        const response = await drive.files.export({ fileId, mimeType: exportMimeType });
        return { name: fileName, content: response.data };
      }
      if (mimeType === "application/pdf") {
        const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data as any);
        const data = await pdf(buffer);
        return { name: fileName, content: data.text || `No text found in ${fileName}.` };
      }
      if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data as any);
        const { value } = await mammoth.extractRawText({ buffer });
        return { name: fileName, content: value };
      }
      if (mimeType === "image/jpeg" || mimeType === "image/png") {
        const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data as any);
        const textContent = await extractTextFromImage(buffer);
        return { name: fileName, content: textContent };
      }
      if (mimeType === "text/plain") {
        const res = await drive.files.get({ fileId, alt: "media" });
        return { name: fileName, content: res.data };
      }
      return {
        name: fileName,
        content: `I can see the file "${fileName}", but I cannot read the content of this specific file type (${mimeType}). I can read Google Docs, Sheets, Slides, PDFs, Word Documents, and text from images.`,
      };
    }

    case "updateDriveFile": {
      const { fileId, content, updateMode = "replace" } = payload;
      if (!fileId || content === undefined) throw new HttpsError("invalid-argument", "'fileId' and 'content' are required.");
      const { data: fileMeta } = await drive.files.get({ fileId, fields: "name, mimeType" });
      const mimeType = fileMeta.mimeType;
      let finalContent = content;
      if (updateMode === "append" || updateMode === "prepend") {
        const oldContent = await getFileContent(fileId, mimeType || undefined);
        finalContent = updateMode === "append" ? `${oldContent}\n\n${content}` : `${content}\n\n${oldContent}`;
      }
      await drive.files.update({
        fileId: fileId,
        media: {
          mimeType: mimeType || "text/plain",
          body: finalContent,
        },
      });
      return { success: true, name: fileMeta.name, message: `Successfully updated the file.` };
    }

    case "createDriveFile": {
      const { name, content, parentId } = payload;
      if (!name) throw new HttpsError("invalid-argument", "A 'name' is required.");
      const fileMetadata: any = { name, mimeType: "application/vnd.google-apps.document" };
      if (parentId) { fileMetadata.parents = [parentId]; }
      const media = { mimeType: "text/plain", body: content || "" };
      const response = await drive.files.create({ resource: fileMetadata, media: media, fields: "id, name, webViewLink" });
      return response.data;
    }

    case "createGoogleDoc": {
      const { title, content, parentId } = payload;
      if (!title) throw new HttpsError("invalid-argument", "A 'title' is required to create a Google Doc.");
      
      try {
        
        // Create Google Doc using Drive API (much more reliable)
        const fileMetadata: any = { 
          name: title, 
          mimeType: "application/vnd.google-apps.document"
        };
        if (parentId) { fileMetadata.parents = [parentId]; }
        
        // Create the Google Doc first
        const response = await drive.files.create({ 
          resource: fileMetadata,
          fields: "id, name, webViewLink" 
        });
        
        // If content is provided, we'll need to add it via the Docs API (more reliable than Drive API for content)
        if (content && content.trim()) {
          try {
            const docs = google.docs({ version: "v1", auth: drive.auth });
            
            await docs.documents.batchUpdate({
              documentId: response.data.id,
              requestBody: {
                requests: [{
                  insertText: {
                    location: {
                      index: 1
                    },
                    text: content
                  }
                }]
              }
            });
          } catch (contentError: any) {
            console.warn(`Could not add content to Google Doc ${response.data.id}:`, contentError.message);
            // Don't fail the entire operation - the doc was created successfully
          }
        }
        
        
        return {
          id: response.data.id,
          title: response.data.name,
          name: response.data.name,
          webViewLink: response.data.webViewLink
        };
      } catch (error: any) {
        console.error(`Failed to create Google Doc "${title}":`, error.response?.data || error.message);
        throw new HttpsError("internal", `Failed to create Google Doc: ${error.message}`);
      }
    }

    case "updateGoogleDoc": {
      const { documentId, content, updateMode = "append" } = payload;
      if (!documentId) throw new HttpsError("invalid-argument", "A 'documentId' is required.");
      if (!content) throw new HttpsError("invalid-argument", "Content is required.");
      
      try {
        const docs = google.docs({ version: "v1", auth: drive.auth });
        
        if (updateMode === "replace") {
          // Get document length first
          const doc = await docs.documents.get({ documentId });
          const docLength = doc.data.body?.content?.[0]?.endIndex || 1;
          
          // Replace all content
          await docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: [
                {
                  deleteContentRange: {
                    range: {
                      startIndex: 1,
                      endIndex: docLength - 1
                    }
                  }
                },
                {
                  insertText: {
                    location: { index: 1 },
                    text: content
                  }
                }
              ]
            }
          });
        } else if (updateMode === "prepend") {
          await docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: [{
                insertText: {
                  location: { index: 1 },
                  text: content + "\n\n"
                }
              }]
            }
          });
        } else { // append
          const doc = await docs.documents.get({ documentId });
          const endIndex = doc.data.body?.content?.[0]?.endIndex || 1;
          
          await docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: [{
                insertText: {
                  location: { index: endIndex - 1 },
                  text: "\n\n" + content
                }
              }]
            }
          });
        }
        
        return { success: true, documentId };
      } catch (error: any) {
        console.error(`Failed to update Google Doc ${documentId}:`, error.response?.data || error.message);
        throw error;
      }
    }

    case "readGoogleDoc": {
      const { documentId } = payload;
      if (!documentId) throw new HttpsError("invalid-argument", "A 'documentId' is required.");
      
      try {
        const docs = google.docs({ version: "v1", auth: drive.auth });
        const response = await docs.documents.get({ documentId });
        
        // Extract text content
        let content = "";
        const body = response.data.body;
        if (body && body.content) {
          for (const element of body.content) {
            if (element.paragraph) {
              for (const textElement of element.paragraph.elements || []) {
                if (textElement.textRun) {
                  content += textElement.textRun.content || "";
                }
              }
            }
          }
        }
        
        return {
          id: documentId,
          name: response.data.title,
          content: content.trim()
        };
      } catch (error: any) {
        console.error(`Failed to read Google Doc ${documentId}:`, error.response?.data || error.message);
        throw error;
      }
    }

    case "createGoogleSlides": {
      const { title, parentId } = payload;
      if (!title) throw new HttpsError("invalid-argument", "A 'title' is required to create a Google Slides presentation.");
      
      try {
        
        // Create Google Slides using Drive API (much more reliable)
        const fileMetadata: any = { 
          name: title, 
          mimeType: "application/vnd.google-apps.presentation"
        };
        if (parentId) { fileMetadata.parents = [parentId]; }
        
        const response = await drive.files.create({ 
          resource: fileMetadata,
          fields: "id, name, webViewLink" 
        });
        
        
        return {
          id: response.data.id,
          title: response.data.name,
          name: response.data.name,
          webViewLink: response.data.webViewLink
        };
      } catch (error: any) {
        console.error(`Failed to create Google Slides "${title}":`, error.response?.data || error.message);
        throw new HttpsError("internal", `Failed to create Google Slides: ${error.message}`);
      }
    }

    case "addSlideToPresentation": {
      const { presentationId, title, content } = payload;
      if (!presentationId) throw new HttpsError("invalid-argument", "A 'presentationId' is required.");
      
      try {
        const slides = google.slides({ version: "v1", auth: drive.auth });
        
        // Create a new slide
        const response = await slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests: [{
              createSlide: {
                slideLayoutReference: {
                  predefinedLayout: "TITLE_AND_BODY"
                }
              }
            }]
          }
        });
        
        const newSlideId = response.data.replies?.[0]?.createSlide?.objectId;
        
        // Add content to the new slide
        if (newSlideId && (title || content)) {
          const requests = [];
          
          if (title) {
            requests.push({
              insertText: {
                objectId: newSlideId,
                text: title,
                insertionIndex: 0
              }
            });
          }
          
          if (content) {
            requests.push({
              insertText: {
                objectId: newSlideId,
                text: content,
                insertionIndex: title ? title.length : 0
              }
            });
          }
          
          if (requests.length > 0) {
            await slides.presentations.batchUpdate({
              presentationId,
              requestBody: { requests }
            });
          }
        }
        
        return { success: true, slideId: newSlideId };
      } catch (error: any) {
        console.error(`Failed to add slide to presentation ${presentationId}:`, error.response?.data || error.message);
        throw error;
      }
    }

    case "createDriveFolder": {
      const { name, parentId } = payload;
      if (!name) throw new HttpsError("invalid-argument", "A 'name' is required to create a folder.");
      const fileMetadata: any = { name, mimeType: "application/vnd.google-apps.folder" };
      if (parentId) { fileMetadata.parents = [parentId]; }
      const response = await drive.files.create({ resource: fileMetadata, fields: "id, name, webViewLink" });
      return response.data;
    }

    case "findFolder": {
      const { query } = payload;
      if (!query) throw new HttpsError("invalid-argument", "A 'query' is required for findFolder.");
      
      // Search for folders specifically
      const response = await drive.files.list({
        q: `name contains '${query}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, mimeType, webViewLink, iconLink, modifiedTime, createdTime, description)",
        pageSize: 50,
        orderBy: "name"
      });
      
      return response.data;
    }

    case "checkGoogleScopes": {
      // Debug function to check what scopes the current token has
      try {
        const oauth2 = google.oauth2({ version: "v2", auth: drive.auth });
        const tokenInfo = await oauth2.tokeninfo();
        return { scopes: tokenInfo.data.scope };
      } catch (error: any) {
        console.error("Failed to check token scopes:", error.message);
        throw new HttpsError("internal", "Failed to check token permissions");
      }
    }

    case "sendGmail": {
      const { to, subject, body, cc, bcc } = payload;
      if (!to || !subject || !body) {
        throw new HttpsError("invalid-argument", "Email requires 'to', 'subject', and 'body' fields.");
      }
      
      try {
        const gmail = google.gmail({ version: "v1", auth: drive.auth });
        
        // Create email message
        let message = `To: ${to}\r\n`;
        if (cc) message += `Cc: ${cc}\r\n`;
        if (bcc) message += `Bcc: ${bcc}\r\n`;
        message += `Subject: ${subject}\r\n`;
        message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
        message += body;
        
        // Encode the message in base64url
        const encodedMessage = Buffer.from(message).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });
        
        return {
          id: response.data.id,
          to,
          subject,
          message: `Email sent to ${to}`
        };
      } catch (error: any) {
        console.error(`Failed to send email to ${to}:`, error.response?.data || error.message);
        throw new HttpsError("internal", `Failed to send email: ${error.message}`);
      }
    }

    case "readGmailMessages": {
      const { query, maxResults = 10 } = payload;
      
      try {
        const gmail = google.gmail({ version: "v1", auth: drive.auth });
        
        // List messages
        const listResponse = await gmail.users.messages.list({
          userId: 'me',
          q: query || '',
          maxResults: Math.min(maxResults, 50) // Cap at 50 for performance
        });
        
        const messages = listResponse.data.messages || [];
        const emailDetails = [];
        
        // Get details for each message (limit to prevent timeout)
        for (const message of messages.slice(0, Math.min(maxResults, 10))) {
          try {
            const messageResponse = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'metadata',
              metadataHeaders: ['From', 'To', 'Subject', 'Date']
            });
            
            const headers = messageResponse.data.payload?.headers || [];
            const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
            
            emailDetails.push({
              id: message.id,
              from: getHeader('From'),
              to: getHeader('To'),
              subject: getHeader('Subject'),
              date: getHeader('Date'),
              snippet: messageResponse.data.snippet || ''
            });
          } catch (msgError: any) {
            console.warn(`Could not read message ${message.id}:`, msgError.message);
          }
        }
        
        return {
          messages: emailDetails,
          totalCount: messages.length
        };
      } catch (error: any) {
        console.error(`Failed to read Gmail messages:`, error.response?.data || error.message);
        throw new HttpsError("internal", `Failed to read emails: ${error.message}`);
      }
    }

    case "createGoogleSheet": {
      const { name, parentId, initialData } = payload;
      if (!name) throw new HttpsError("invalid-argument", "A 'name' is required to create a Google Sheet.");
      
      try {
        
        const fileMetadata: any = { 
          name, 
          mimeType: "application/vnd.google-apps.spreadsheet" 
        };
        if (parentId) { fileMetadata.parents = [parentId]; }
        
        const response = await drive.files.create({ 
          resource: fileMetadata, 
          fields: "id, name, webViewLink" 
        });
        
        
        // Note: Initial data addition via Sheets API has been disabled to avoid authentication issues
        // The sheet is created successfully and users can manually add data
        if (initialData && Array.isArray(initialData) && initialData.length > 0) {
        }
        
        return response.data;
      } catch (createError: any) {
        console.error(`Failed to create Google Sheet "${name}":`, createError.response?.data || createError.message);
        throw createError;
      }
    }

    case "readGoogleSheet": {
      const { fileId, range } = payload;
      if (!fileId) throw new HttpsError("invalid-argument", "A 'fileId' is required to read a Google Sheet.");
      
      const sheets = google.sheets({ version: "v4", auth: drive.auth });
      const { data: fileMeta } = await drive.files.get({ fileId, fields: "name" });
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: range || "A1:Z1000", // Default range if not specified
      });
      
      return {
        name: fileMeta.name || "Untitled Spreadsheet",
        values: response.data.values || [],
        range: response.data.range
      };
    }

    case "updateGoogleSheet": {
      const { fileId, range, values, append } = payload;
      if (!fileId || !values) throw new HttpsError("invalid-argument", "'fileId' and 'values' are required to update a Google Sheet.");
      
      const sheets = google.sheets({ version: "v4", auth: drive.auth });
      const { data: fileMeta } = await drive.files.get({ fileId, fields: "name" });
      
      let response;
      if (append) {
        // Append data to the sheet
        response = await sheets.spreadsheets.values.append({
          spreadsheetId: fileId,
          range: range || "A1",
          valueInputOption: "RAW",
          requestBody: {
            values: Array.isArray(values[0]) ? values : [values]
          }
        });
      } else {
        // Update specific range
        response = await sheets.spreadsheets.values.update({
          spreadsheetId: fileId,
          range: range || "A1",
          valueInputOption: "RAW",
          requestBody: {
            values: Array.isArray(values[0]) ? values : [values]
          }
        });
      }
      
      return {
        success: true,
        name: fileMeta.name,
        updatedRange: (response.data as any).updatedRange || (response.data as any).updates?.updatedRange,
        updatedRows: (response.data as any).updatedRows || (response.data as any).updates?.updatedRows,
        updatedColumns: (response.data as any).updatedColumns || (response.data as any).updates?.updatedColumns,
        updatedCells: (response.data as any).updatedCells || (response.data as any).updates?.updatedCells,
        isAppend: append
      };
    }

    case "batchUpdateGoogleSheet": {
      const { fileId, updates } = payload;
      if (!fileId || !updates || !Array.isArray(updates)) {
        throw new HttpsError("invalid-argument", "'fileId' and 'updates' array are required for batch updates.");
      }
      
      const sheets = google.sheets({ version: "v4", auth: drive.auth });
      const { data: fileMeta } = await drive.files.get({ fileId, fields: "name" });
      
      // Prepare batch update requests
      const requests = updates.map((update: any) => ({
        range: update.range,
        values: Array.isArray(update.values[0]) ? update.values : [update.values]
      }));
      
      const response = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: fileId,
        requestBody: {
          valueInputOption: "RAW",
          data: requests
        }
      });
      
      return {
        success: true,
        name: fileMeta.name,
        totalUpdatedCells: response.data.totalUpdatedCells,
        totalUpdatedRows: response.data.totalUpdatedRows,
        totalUpdatedColumns: response.data.totalUpdatedColumns,
        responses: response.data.responses
      };
    }

    case "sendGmail": {
      const { to, subject, body, cc, bcc } = payload;
      if (!to || !subject || !body) {
        throw new HttpsError("invalid-argument", "Missing required fields: 'to', 'subject', and 'body' are required.");
      }
      
      try {
        const gmail = google.gmail({ version: "v1", auth: drive.auth });
        
        // Create the email message
        const email = [
          `To: ${to}`,
          cc ? `Cc: ${cc}` : '',
          bcc ? `Bcc: ${bcc}` : '',
          `Subject: ${subject}`,
          '',
          body
        ].filter(line => line !== '').join('\n');
        
        // Encode the email in base64
        const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });
        
        return {
          success: true,
          messageId: response.data.id,
          to,
          subject
        };
      } catch (error: any) {
        console.error(`Failed to send email:`, error.response?.data || error.message);
        throw error;
      }
    }

    case "readGmailMessages": {
      const { maxResults = 10, query } = payload;
      
      try {
        const gmail = google.gmail({ version: "v1", auth: drive.auth });
        
        // List messages
        const listResponse = await gmail.users.messages.list({
          userId: 'me',
          maxResults,
          q: query
        });
        
        const messages = listResponse.data.messages || [];
        
        // Get details for each message
        const detailedMessages = await Promise.all(
          messages.map(async (message) => {
            const messageDetails = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!
            });
            
            const headers = messageDetails.data.payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || '';
            const from = headers.find(h => h.name === 'From')?.value || '';
            const date = headers.find(h => h.name === 'Date')?.value || '';
            
            // Extract body text (simplified)
            let body = '';
            const payload = messageDetails.data.payload;
            if (payload?.body?.data) {
              body = Buffer.from(payload.body.data, 'base64').toString();
            } else if (payload?.parts) {
              for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                  body = Buffer.from(part.body.data, 'base64').toString();
                  break;
                }
              }
            }
            
            return {
              id: message.id,
              subject,
              from,
              date,
              body: body.substring(0, 500) + (body.length > 500 ? '...' : '') // Truncate for summary
            };
          })
        );
        
        return {
          messages: detailedMessages,
          totalCount: listResponse.data.resultSizeEstimate
        };
      } catch (error: any) {
        console.error(`Failed to read Gmail messages:`, error.response?.data || error.message);
        throw error;
      }
    }

    case "grantStudentAccess": {
      const { userId, email, verificationCode, sentCode } = payload;
      if (!userId || !email || !verificationCode || !sentCode) {
        throw new HttpsError("invalid-argument", "Missing required parameters for student access grant");
      }
      
      // Clean both codes by removing spaces and normalizing
      const cleanReceivedCode = verificationCode.toString().replace(/\s+/g, '').trim();
      const cleanExpectedCode = sentCode.toString().replace(/\s+/g, '').trim();
      
      // Verify the code matches
      if (cleanReceivedCode !== cleanExpectedCode) {
        console.error('Code mismatch:', { 
          received: verificationCode, 
          expected: sentCode,
          cleanReceived: cleanReceivedCode,
          cleanExpected: cleanExpectedCode
        });
        throw new HttpsError("permission-denied", "Invalid verification code");
      }
      
      // Verify it's an educational email or test email
      const emailLower = email.toLowerCase();
      const domain = emailLower.split('@')[1];
      
      // Temporary test emails for development/testing
      const testEmails = [
        'oliverbeckett069420@gmail.com'
      ];
      
      const academicPatterns = [
        '.edu', '.ac.uk', '.edu.au', '.ac.nz', '.edu.sg', '.ac.in',
        '.edu.my', '.ac.za', '.edu.hk', '.ac.jp', '.edu.tw', '.ac.th',
        '.edu.ph', '.ac.kr', '.edu.br', '.ac.mx', '.edu.co', '.ac.pe',
        '.edu.ar', '.ac.cl', '.edu.ec', '.ac.ve', '.edu.uy', '.ac.py',
        '.edu.bo', '.ac.cr', '.edu.pa', '.ac.ni', '.edu.hn', '.ac.sv',
        '.edu.gt', '.ac.bz', '.edu.jm', '.ac.bb', '.edu.tt', '.ac.gy',
        '.edu.sr', '.ac.gf', '.edu.fk', '.ac.gs', '.edu.sh', '.ac.tc',
        '.edu.vg', '.ac.ai', '.edu.ag', '.ac.dm', '.edu.gd', '.ac.kn',
        '.edu.lc', '.ac.vc', '.edu.ms', '.ac.pr', '.edu.vi', '.ac.as',
        '.edu.gu', '.ac.mp', '.edu.pw', '.ac.fm', '.edu.mh', '.ac.ki',
        '.edu.nr', '.ac.nu', '.edu.tk', '.ac.tv', '.edu.ws', '.ac.to',
        '.edu.fj', '.ac.sb', '.edu.vu', '.ac.nc', '.edu.pf', '.ac.wf',
        '.edu.ck', '.ac.pn', '.edu.nf', '.ac.cx', '.edu.cc', '.ac.hm',
        '.edu.aq', '.ac.tf'
      ];
      
      const isTestEmail = testEmails.includes(emailLower);
      const isValidAcademicEmail = academicPatterns.some(pattern => domain?.endsWith(pattern));
      
      if (!isTestEmail && !isValidAcademicEmail) {
        throw new HttpsError("permission-denied", "Invalid academic email domain");
      }
      
      try {
        // Grant 2 months of Pro access by setting premiumAwardedUntil
        const twoMonthsFromNow = new Date();
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
        
        const userRef = admin.firestore().collection('users').doc(userId);
        
        await userRef.update({
          premiumAwardedUntil: admin.firestore.Timestamp.fromDate(twoMonthsFromNow),
          activeTier: 'pro',
          studentDiscountGranted: true,
          studentDiscountEmail: email,
          studentDiscountGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        
        return {
          success: true,
          message: "Student Pro access granted successfully",
          expiresAt: twoMonthsFromNow.toISOString(),
          tier: 'pro'
        };
        
      } catch (error) {
        console.error("Error granting student access:", error);
        throw new HttpsError("internal", "Failed to grant student access");
      }
    }

    default:
      throw new HttpsError("invalid-argument", `Unknown Google Drive action: ${action}`);
  }
}

async function executeCalendarAction(calendar: any, action: string, payload: any) {
  switch (action) {
    case "listCalendarEvents": {
      const { timeMin, timeMax, maxResults } = payload;
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin || (new Date()).toISOString(),
        timeMax: timeMax,
        maxResults: maxResults || 50, // Increased default for better coverage
        singleEvents: true,
        orderBy: "startTime",
      });
      return response.data;
    }
    
    case "createCalendarEvent": {
      const { summary, description, start, end, location, attendees } = payload;
      if (!summary || !start || !end) {
        throw new HttpsError("invalid-argument", "summary, start, and end are required for creating an event.");
      }
      const event: any = {
        summary,
        description,
        start: { dateTime: start, timeZone: "UTC" },
        end: { dateTime: end, timeZone: "UTC" },
      };
      if (location) event.location = location;
      if (attendees && Array.isArray(attendees)) {
        event.attendees = attendees.map((email: string) => ({ email }));
      }
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });
      return response.data;
    }
    
    case "updateCalendarEvent": {
      const { eventId, summary, description, start, end, location, attendees } = payload;
      if (!eventId) {
        throw new HttpsError("invalid-argument", "eventId is required for updating an event.");
      }
      
      // Get the existing event first
      const existingEvent = await calendar.events.get({
        calendarId: "primary",
        eventId: eventId,
      });
      
      // Build the updated event with only provided fields
      const updatedEvent: any = { ...existingEvent.data };
      if (summary !== undefined) updatedEvent.summary = summary;
      if (description !== undefined) updatedEvent.description = description;
      if (start !== undefined) updatedEvent.start = { dateTime: start, timeZone: "UTC" };
      if (end !== undefined) updatedEvent.end = { dateTime: end, timeZone: "UTC" };
      if (location !== undefined) updatedEvent.location = location;
      if (attendees !== undefined && Array.isArray(attendees)) {
        updatedEvent.attendees = attendees.map((email: string) => ({ email }));
      }
      
      const response = await calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: updatedEvent,
      });
      return response.data;
    }
    
    case "deleteCalendarEvent": {
      const { eventId } = payload;
      if (!eventId) {
        throw new HttpsError("invalid-argument", "eventId is required for deleting an event.");
      }
      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });
      return { success: true, message: "Event deleted successfully" };
    }
    
    case "searchCalendarEvents": {
      const { query, timeMin, timeMax } = payload;
      if (!query) {
        throw new HttpsError("invalid-argument", "query is required for searching events.");
      }
      const response = await calendar.events.list({
        calendarId: "primary",
        q: query,
        timeMin: timeMin || (new Date()).toISOString(),
        timeMax: timeMax,
        maxResults: 25,
        singleEvents: true,
        orderBy: "startTime",
      });
      return response.data;
    }
    
    default:
      throw new HttpsError("invalid-argument", `Unknown Google Calendar action: ${action}`);
  }
}

async function executeTasksAction(tasks: any, action: string, payload: any) {
  switch (action) {
    case "listTaskLists": {
      const response = await tasks.tasklists.list({
        maxResults: 50,
      });
      return response.data;
    }
    
    case "listTasks": {
      const { tasklistId } = payload;
      if (!tasklistId) {
        throw new HttpsError("invalid-argument", "tasklistId is required for listing tasks.");
      }
      const response = await tasks.tasks.list({
        tasklist: tasklistId,
        maxResults: 100,
        showCompleted: true,
        showDeleted: false,
        showHidden: true,
      });
      return response.data;
    }
    
    case "createTask": {
      const { tasklistId, title, notes, due } = payload;
      if (!tasklistId || !title) {
        throw new HttpsError("invalid-argument", "tasklistId and title are required for creating a task.");
      }
      const task: any = {
        title,
        notes,
      };
      if (due) task.due = due;
      
      const response = await tasks.tasks.insert({
        tasklist: tasklistId,
        requestBody: task,
      });
      return response.data;
    }
    
    case "updateTask": {
      const { tasklistId, taskId, title, notes, due, status } = payload;
      if (!tasklistId || !taskId) {
        throw new HttpsError("invalid-argument", "tasklistId and taskId are required for updating a task.");
      }
      
      // Get the existing task first
      const existingTask = await tasks.tasks.get({
        tasklist: tasklistId,
        task: taskId,
      });
      
      // Build the updated task with only provided fields
      const updatedTask: any = { ...existingTask.data };
      if (title !== undefined) updatedTask.title = title;
      if (notes !== undefined) updatedTask.notes = notes;
      if (due !== undefined) updatedTask.due = due;
      if (status !== undefined) updatedTask.status = status;
      
      const response = await tasks.tasks.update({
        tasklist: tasklistId,
        task: taskId,
        requestBody: updatedTask,
      });
      return response.data;
    }
    
    case "deleteTask": {
      const { tasklistId, taskId } = payload;
      if (!tasklistId || !taskId) {
        throw new HttpsError("invalid-argument", "tasklistId and taskId are required for deleting a task.");
      }
      await tasks.tasks.delete({
        tasklist: tasklistId,
        task: taskId,
      });
      return { success: true, message: "Task deleted successfully" };
    }
    
    default:
      throw new HttpsError("invalid-argument", `Unknown Google Tasks action: ${action}`);
  }
}

// Student verification function - separate from Google Drive actions
export const grantStudentAccess = functionsV1.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functionsV1.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { email, verificationCode, sentCode } = data;
  const userId = context.auth.uid;
  
  if (!userId || !email || !verificationCode || !sentCode) {
    throw new functionsV1.https.HttpsError("invalid-argument", "Missing required parameters for student access grant");
  }
  
  // Clean both codes by removing spaces and normalizing
  const cleanReceivedCode = verificationCode.toString().replace(/\s+/g, '').trim();
  const cleanExpectedCode = sentCode.toString().replace(/\s+/g, '').trim();
  
  // Verify the code matches
  if (cleanReceivedCode !== cleanExpectedCode) {
    throw new functionsV1.https.HttpsError("permission-denied", "Invalid verification code");
  }
  
  // Verify it's an educational email or test email
  const emailLower = email.toLowerCase();
  const domain = emailLower.split('@')[1];
  
  const academicPatterns = [
    '.edu', '.ac.uk', '.edu.au', '.ac.nz', '.edu.sg', '.ac.in',
    '.edu.my', '.ac.za', '.edu.hk', '.ac.jp', '.edu.tw', '.ac.th',
    '.edu.ph', '.ac.kr', '.edu.br', '.ac.mx', '.edu.co', '.ac.pe',
    '.edu.ar', '.ac.cl', '.edu.ec', '.ac.ve', '.edu.uy', '.ac.py',
    '.edu.bo', '.ac.cr', '.edu.pa', '.ac.ni', '.edu.hn', '.ac.sv',
    '.edu.gt', '.ac.bz', '.edu.jm', '.ac.bb', '.edu.tt', '.ac.gy',
    '.edu.sr', '.ac.gf', '.edu.fk', '.ac.gs', '.edu.sh', '.ac.tc',
    '.edu.vg', '.ac.ai', '.edu.ag', '.ac.dm', '.edu.gd', '.ac.kn',
    '.edu.lc', '.ac.vc', '.edu.ms', '.ac.pr', '.edu.vi', '.ac.as',
    '.edu.gu', '.ac.mp', '.edu.pw', '.ac.fm', '.edu.mh', '.ac.ki',
    '.edu.nr', '.ac.nu', '.edu.tk', '.ac.tv', '.edu.ws', '.ac.to',
    '.edu.fj', '.ac.sb', '.edu.vu', '.ac.nc', '.edu.pf', '.ac.wf',
    '.edu.ck', '.ac.pn', '.edu.nf', '.ac.cx', '.edu.cc', '.ac.hm',
    '.edu.aq', '.ac.tf'
  ];
  
  const isValidAcademicEmail = academicPatterns.some(pattern => domain?.endsWith(pattern));
  
  if (!isValidAcademicEmail) {
    throw new functionsV1.https.HttpsError("permission-denied", "Invalid academic email domain");
  }
  
  try {
    // Get current user data to check existing tier
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functionsV1.https.HttpsError("not-found", "User profile not found");
    }
    
    const userData = userDoc.data();
    
    // Determine what to grant based on current tier
    const currentTier = userData?.activeTier || 'basic';
    const hasExistingPremium = userData?.premiumAwardedUntil && 
      new Date(userData.premiumAwardedUntil.toDate ? userData.premiumAwardedUntil.toDate() : userData.premiumAwardedUntil) > new Date();
    
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    
    if (currentTier === 'premium' || hasExistingPremium) {
      // User already has premium - they don't get student discount
      throw new functionsV1.https.HttpsError("already-exists", "Premium users are not eligible for student discount");
    } else {
      // User is basic/pro - grant 2 months of Pro access
      await userRef.update({
        activeTier: 'pro',
        studentDiscountGranted: true,
        studentDiscountEmail: email,
        studentDiscountGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        studentDiscountExpiresAt: admin.firestore.Timestamp.fromDate(twoMonthsFromNow),
        studentDiscountType: 'pro_access',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        success: true,
        message: "Student Pro access granted successfully",
        expiresAt: twoMonthsFromNow.toISOString(),
        tier: 'pro'
      };
    }
    
  } catch (error) {
    console.error("Error granting student access:", error);
    throw new functionsV1.https.HttpsError("internal", "Failed to grant student access");
  }
});

// Fix existing users who got Premium instead of Pro from student discount
export const fixStudentDiscountTiers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { adminKey } = request.data;
  
  // Simple admin check - you can make this more secure
  if (adminKey !== "fix-student-tiers-2024") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  try {
    // Find all users with studentDiscountGranted but no studentDiscountType
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('studentDiscountGranted', '==', true).get();
    
    const fixes = [];
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Skip users who already have the correct studentDiscountType
      if (userData.studentDiscountType) {
        continue;
      }
      
      // Calculate 2 months from when they got the discount
      const grantedAt = userData.studentDiscountGrantedAt ? 
        new Date(userData.studentDiscountGrantedAt.toDate ? userData.studentDiscountGrantedAt.toDate() : userData.studentDiscountGrantedAt) :
        new Date();
      
      const twoMonthsFromGrant = new Date(grantedAt);
      twoMonthsFromGrant.setMonth(twoMonthsFromGrant.getMonth() + 2);
      
      // Check if student discount should still be active
      const isStillActive = twoMonthsFromGrant > new Date();
      
      if (isStillActive) {
        // Set to Pro tier with proper expiration
        await userDoc.ref.update({
          activeTier: 'pro',
          premiumAwardedUntil: null, // Remove premium award
          studentDiscountExpiresAt: admin.firestore.Timestamp.fromDate(twoMonthsFromGrant),
          studentDiscountType: 'pro_access',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        fixes.push({
          userId,
          email: userData.email,
          action: 'downgraded_to_pro',
          expiresAt: twoMonthsFromGrant.toISOString()
        });
      } else {
        // Student discount has expired - set back to basic
        await userDoc.ref.update({
          activeTier: 'basic',
          premiumAwardedUntil: null,
          studentDiscountGranted: false,
          studentDiscountType: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        fixes.push({
          userId,
          email: userData.email,
          action: 'expired_set_to_basic',
          expiredAt: twoMonthsFromGrant.toISOString()
        });
      }
    }
    
    
    return {
      success: true,
      message: `Fixed ${fixes.length} users`,
      fixes: fixes
    };
    
  } catch (error) {
    console.error("Error fixing student discount tiers:", error);
    throw new HttpsError("internal", "Failed to fix student discount tiers");
  }
});

// /functions/src/index.ts

export const googleProxy = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { service, action, payload } = request.data;
  const uid = request.auth.uid;

  if (!service || (service !== "drive" && service !== "calendar" && service !== "tasks") || !action || !payload) {
    throw new HttpsError("invalid-argument", "Request must include 'service', 'action', and 'payload'.");
  }

  const userDocRef = admin.firestore().collection("users").doc(uid);
  const userDoc = await userDocRef.get();

  const tokens = (userDoc.data() as any)?.googleTokens;

  if (!tokens || !tokens.access_token) {
    throw new HttpsError("failed-precondition", `Google services are not connected. Please connect in settings.`);
  }

  const oAuth2Client = new google.auth.OAuth2(googleClientId.value(), googleClientSecret.value());
  oAuth2Client.setCredentials(tokens);

  // Enhanced token refresh handling
  oAuth2Client.on("tokens", (newTokens) => {
    const updatedTokens = { ...tokens, ...newTokens };
    userDocRef.update({ 
      googleTokens: updatedTokens,
      googleDriveConnected: true,
      googleCalendarConnected: true,
      googleTokensLastRefresh: admin.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
      console.error(`FAILED to save refreshed Google tokens for user ${uid}:`, err);
    });
  });

  // Proactive token refresh if expiry is near (within 5 minutes)
  try {
    if (tokens.expiry_date) {
      const expiryTime = new Date(tokens.expiry_date);
      const now = new Date();
      const timeUntilExpiry = expiryTime.getTime() - now.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeUntilExpiry < fiveMinutes) {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        
        // Update tokens in Firestore
        await userDocRef.update({ 
          googleTokens: credentials,
          googleDriveConnected: true,
          googleCalendarConnected: true,
          googleTokensLastRefresh: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } catch (refreshError: any) {
    console.warn(`Failed to proactively refresh token for user ${uid}:`, refreshError.message);
    // Continue with existing token - might still work or will trigger reactive refresh
  }

  // First attempt
  try {
    if (service === "drive") {
      const drive = google.drive({ version: "v3", auth: oAuth2Client });
      return await executeDriveAction(drive, action, payload);
    } else if (service === "calendar") {
      const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
      return await executeCalendarAction(calendar, action, payload);
    } else if (service === "tasks") {
      const tasks = google.tasks({ version: "v1", auth: oAuth2Client });
      return await executeTasksAction(tasks, action, payload);
    } else {
      throw new HttpsError("invalid-argument", `Invalid service: ${service}`);
    }
  } catch (error: any) {
    console.error(`Error in googleProxy for ${service} action ${action}:`, error.response?.data || error.message);
    
    // Check if this is an authentication error that we can retry with token refresh
    const errorMessage = error.response?.data?.error?.message || error.message || "";
    const isAuthError = errorMessage.includes("authentication credential") || 
                       errorMessage.includes("access token") || 
                       errorMessage.includes("invalid_grant") ||
                       errorMessage.includes("Token has been expired") ||
                       error.response?.status === 401;
    
    if (isAuthError && tokens.refresh_token) {
      
      try {
        // Force refresh the token
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        
        // Update tokens in Firestore
        await userDocRef.update({ 
          googleTokens: credentials,
          googleDriveConnected: true,
          googleCalendarConnected: true,
          googleTokensLastRefresh: admin.firestore.FieldValue.serverTimestamp()
        });
        
        
        // Retry the original action with refreshed token
        if (service === "drive") {
          const drive = google.drive({ version: "v3", auth: oAuth2Client });
          return await executeDriveAction(drive, action, payload);
        } else if (service === "calendar") {
          const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
          return await executeCalendarAction(calendar, action, payload);
        } else if (service === "tasks") {
          const tasks = google.tasks({ version: "v1", auth: oAuth2Client });
          return await executeTasksAction(tasks, action, payload);
        }
      } catch (refreshError: any) {
        console.error(`Failed to refresh token for user ${uid}:`, refreshError.message);
        throw new HttpsError("unauthenticated", "Your Google connection has expired and couldn't be refreshed. Please reconnect Google in Settings to continue using Google Drive and Calendar features.");
      }
    }
    
    if (error.code && error.http) {
      throw error;
    }
    
    if (isAuthError) {
      throw new HttpsError("unauthenticated", "Your Google connection has expired. Please reconnect Google in Settings to continue using Google Drive and Calendar features.");
    }
    
    throw new HttpsError("internal", sanitizeErrorMessage(errorMessage));
  }
});

// ==================== TOKEN MAINTENANCE ====================

// Scheduled function to refresh Google tokens before they expire
export const refreshExpiredGoogleTokens = onSchedule("every 30 minutes", async (event) => {
  
  try {
    const usersCollection = admin.firestore().collection("users");
    const snapshot = await usersCollection.where("googleDriveConnected", "==", true).get();
    
    let refreshedCount = 0;
    let errorCount = 0;
    
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const tokens = userData.googleTokens;
      
      if (!tokens || !tokens.refresh_token) continue;
      
      try {
        // Check if token expires within the next hour
        if (tokens.expiry_date) {
          const expiryTime = new Date(tokens.expiry_date);
          const now = new Date();
          const timeUntilExpiry = expiryTime.getTime() - now.getTime();
          const oneHour = 60 * 60 * 1000;
          
          if (timeUntilExpiry < oneHour && timeUntilExpiry > 0) {
            
            const oAuth2Client = new google.auth.OAuth2(
              googleClientId.value(),
              googleClientSecret.value()
            );
            oAuth2Client.setCredentials(tokens);
            
            const { credentials } = await oAuth2Client.refreshAccessToken();
            
            await doc.ref.update({
              googleTokens: credentials,
              googleTokensLastRefresh: admin.firestore.FieldValue.serverTimestamp()
            });
            
            refreshedCount++;
          }
        }
      } catch (error: any) {
        console.error(`Failed to refresh token for user ${doc.id}:`, error.message);
        errorCount++;
      }
    }
    
  } catch (error: any) {
    console.error("Error in scheduled token refresh:", error.message);
  }
});

// Manual token refresh function for users experiencing auth issues
export const refreshGoogleTokens = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const userDocRef = admin.firestore().collection("users").doc(uid);
  const userDoc = await userDocRef.get();
  
  const tokens = (userDoc.data() as any)?.googleTokens;
  
  if (!tokens || !tokens.refresh_token) {
    throw new HttpsError("failed-precondition", "No Google tokens found. Please reconnect Google in Settings.");
  }

  try {
    
    const oAuth2Client = new google.auth.OAuth2(
      googleClientId.value(),
      googleClientSecret.value()
    );
    oAuth2Client.setCredentials(tokens);
    
    const { credentials } = await oAuth2Client.refreshAccessToken();
    
    await userDocRef.update({
      googleTokens: credentials,
      googleDriveConnected: true,
      googleCalendarConnected: true,
      googleTokensLastRefresh: admin.firestore.FieldValue.serverTimestamp()
    });
    
    
    return { 
      success: true, 
      message: "Google tokens refreshed successfully",
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null
    };
    
  } catch (error: any) {
    console.error(`Failed to refresh Google tokens for user ${uid}:`, error.message);
    throw new HttpsError("internal", `Failed to refresh tokens: ${error.message}`);
  }
});

// ------------------- YouTube Data API Integration -------------------

/**
 * Search for YouTube videos with validation and quality filtering
 */
export const searchYouTubeVideos = functionsV1.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functionsV1.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { query, maxResults = 10, order = 'relevance' } = data;
  
  if (!query) {
    throw new functionsV1.https.HttpsError("invalid-argument", "Search query is required.");
  }

  try {
    const apiKey = youtubeApiKey.value();
    if (!apiKey) {
      throw new functionsV1.https.HttpsError("internal", "YouTube API key not configured.");
    }

    // YouTube Data API v3 search endpoint with optimized parameters
    const searchUrl = `https://www.googleapis.com/youtube/v3/search`;
    const searchParams = new URLSearchParams({
      key: apiKey,
      part: 'snippet', // Minimal part to reduce quota usage (1 unit per request)
      q: query,
      type: 'video',
      maxResults: Math.min(maxResults, 25).toString(), // Limit to 25 max (API limit is 50)
      order: order, // relevance, date, rating, viewCount, title
      videoEmbeddable: 'true', // Only embeddable videos
      videoSyndicated: 'true', // Only syndicated videos
      safeSearch: 'moderate',
      relevanceLanguage: 'en', // Prefer English content for better educational value
      regionCode: 'US' // Can be made configurable later
    });

    // Optimized fetch with gzip compression and proper headers
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': 'TaskMaster-YouTube-API/1.0 (gzip)'
      }
    });
    
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      throw new Error(`YouTube API error: ${errorData.error?.message || searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return {
        videos: [],
        message: "No videos found for this query."
      };
    }

    // Get video IDs for additional metadata
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    // Get detailed video information including statistics
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos`;
    const videosParams = new URLSearchParams({
      key: apiKey,
      part: 'snippet,statistics,contentDetails,status',
      id: videoIds
    });

    const videosResponse = await fetch(`${videosUrl}?${videosParams}`, {
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': 'TaskMaster-YouTube-API/1.0 (gzip)'
      }
    });
    const videosData = await videosResponse.json();

    // Process and validate videos
    const validatedVideos = videosData.items
      .filter((video: any) => {
        // Filter out private, deleted, or unavailable videos
        return video.status?.uploadStatus === 'processed' && 
               video.status?.privacyStatus === 'public' &&
               !video.status?.rejectionReason &&
               video.snippet?.title !== 'Private video' &&
               video.snippet?.title !== 'Deleted video';
      })
      .map((video: any) => {
        const snippet = video.snippet;
        const statistics = video.statistics;
        const contentDetails = video.contentDetails;
        
        // Calculate quality score based on views, likes, and recency
        const viewCount = parseInt(statistics?.viewCount || '0');
        const likeCount = parseInt(statistics?.likeCount || '0');
        const publishedDate = new Date(snippet.publishedAt);
        const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Quality scoring algorithm
        let qualityScore = 0;
        qualityScore += Math.log10(viewCount + 1) * 10; // View count weight
        qualityScore += Math.log10(likeCount + 1) * 5;  // Like count weight
        qualityScore -= Math.min(daysSincePublished / 365, 2) * 10; // Recency bonus (max 2 years)
        
        // Prefer verified channels and educational content
        if (snippet.channelTitle?.includes('Official') || 
            snippet.channelTitle?.includes('Education') ||
            snippet.channelTitle?.includes('University') ||
            snippet.channelTitle?.includes('Academy')) {
          qualityScore += 20;
        }

        return {
          videoId: video.id,
          title: snippet.title,
          channelTitle: snippet.channelTitle,
          description: snippet.description,
          publishedAt: snippet.publishedAt,
          thumbnails: snippet.thumbnails,
          duration: contentDetails.duration,
          viewCount: statistics.viewCount,
          likeCount: statistics.likeCount,
          commentCount: statistics.commentCount,
          embedUrl: `https://www.youtube.com/embed/${video.id}`,
          watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
          qualityScore: Math.round(qualityScore),
          isVerified: snippet.channelTitle?.includes('Official') || false
        };
      })
      .sort((a: any, b: any) => b.qualityScore - a.qualityScore); // Sort by quality score

    return {
      videos: validatedVideos,
      totalResults: searchData.pageInfo?.totalResults || 0,
      query: query
    };

  } catch (error: any) {
    console.error("YouTube search error:", error);
    throw new functionsV1.https.HttpsError("internal", `YouTube search failed: ${sanitizeErrorMessage(error)}`);
  }
});

/**
 * Validate a specific YouTube video by ID
 */
export const validateYouTubeVideo = functionsV1.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functionsV1.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { videoId } = data;
  
  if (!videoId) {
    throw new functionsV1.https.HttpsError("invalid-argument", "Video ID is required.");
  }

  try {
    const apiKey = youtubeApiKey.value();
    if (!apiKey) {
      throw new functionsV1.https.HttpsError("internal", "YouTube API key not configured.");
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos`;
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet,status,contentDetails',
      id: videoId
    });

    const response = await fetch(`${videosUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        isValid: false,
        reason: "Video not found or is private/deleted"
      };
    }

    const video = data.items[0];
    const status = video.status;
    const snippet = video.snippet;

    // Check if video is available and embeddable
    const isValid = status.uploadStatus === 'processed' && 
                   status.privacyStatus === 'public' &&
                   !status.rejectionReason &&
                   snippet.title !== 'Private video' &&
                   snippet.title !== 'Deleted video';

    return {
      isValid,
      videoId: video.id,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      embedUrl: isValid ? `https://www.youtube.com/embed/${video.id}` : null,
      reason: isValid ? null : "Video is private, deleted, or not embeddable"
    };

  } catch (error: any) {
    console.error("YouTube validation error:", error);
    throw new functionsV1.https.HttpsError("internal", `YouTube validation failed: ${sanitizeErrorMessage(error)}`);
  }
});

/**
 * Get trending videos by category (educational, technology, etc.)
 */
export const getTrendingYouTubeVideos = functionsV1.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functionsV1.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { categoryId = '27', regionCode = 'US', maxResults = 10 } = data; // Default to Education category

  try {
    const apiKey = youtubeApiKey.value();
    if (!apiKey) {
      throw new functionsV1.https.HttpsError("internal", "YouTube API key not configured.");
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos`;
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode: regionCode,
      categoryId: categoryId,
      maxResults: Math.min(maxResults, 25).toString()
    });

    const response = await fetch(`${videosUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    const videos = data.items.map((video: any) => ({
      videoId: video.id,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      thumbnails: video.snippet.thumbnails,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      embedUrl: `https://www.youtube.com/embed/${video.id}`,
      watchUrl: `https://www.youtube.com/watch?v=${video.id}`
    }));

    return {
      videos,
      categoryId,
      regionCode
    };

  } catch (error: any) {
    console.error("YouTube trending error:", error);
    throw new functionsV1.https.HttpsError("internal", `YouTube trending failed: ${sanitizeErrorMessage(error)}`);
  }
});

/**
 * Process YouTube video - Extract transcript and generate notes
 */
export const processYouTubeVideo = functionsV1.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functionsV1.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { videoId } = data;
  
  if (!videoId) {
    throw new functionsV1.https.HttpsError("invalid-argument", "Video ID is required.");
  }

  try {
    const apiKey = youtubeApiKey.value();
    if (!apiKey) {
      throw new functionsV1.https.HttpsError("internal", "YouTube API key not configured.");
    }

    // First, validate the video exists and get metadata
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos`;
    const videoParams = new URLSearchParams({
      key: apiKey,
      part: 'snippet,contentDetails',
      id: videoId
    });

    const videoResponse = await fetch(`${videosUrl}?${videoParams}`);
    
    if (!videoResponse.ok) {
      throw new Error(`YouTube API error: ${videoResponse.statusText}`);
    }

    const videoData = await videoResponse.json();
    
    if (!videoData.items || videoData.items.length === 0) {
      throw new functionsV1.https.HttpsError("not-found", "Video not found or not accessible.");
    }

    const video = videoData.items[0];
    const title = video.snippet.title;
    const description = video.snippet.description;
    const channelTitle = video.snippet.channelTitle;
    const duration = video.contentDetails.duration;
    
    // Try to get transcript using youtube-transcript library or similar approach
    // For now, we'll use a placeholder since transcript extraction requires additional setup
    let transcript = '';
    
    try {
      // This would need to be implemented with a proper transcript extraction service
      // For now, we'll use the video description as fallback content
      transcript = description || `Video: ${title} by ${channelTitle}`;
    } catch (transcriptError) {
      console.warn("Transcript extraction failed, using description:", transcriptError);
      transcript = description || `Video: ${title} by ${channelTitle}`;
    }

    if (!transcript || transcript.trim().length < 50) {
      throw new functionsV1.https.HttpsError("invalid-argument", 
        "Unable to extract sufficient content from video. The video may not have captions or sufficient description.");
    }

    // Generate AI content using the same approach as other processors
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functionsV1.https.HttpsError("unauthenticated", "User ID is required.");
    }
    
    // Get appropriate API key based on user tier
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();
    const userTier = userData?.activeTier || 'basic';
    
    const geminiApiKey = userTier === 'basic' 
      ? taskMasterApiKeyFree.value() 
      : taskMasterApiKeyPaid.value();
    
    // Create AI prompts for processing
    const titlePrompt = `Generate a clear, descriptive title for study notes based on this YouTube video content. Title should be academic and specific.

Video Title: ${title}
Content: ${transcript.substring(0, 1000)}...

Respond with ONLY the title, no quotes or extra text.`;

    const contentPrompt = `Convert this YouTube video content into comprehensive study notes in HTML format. Focus on key concepts, important details, and learning objectives.

Video: ${title} by ${channelTitle}
Content: ${transcript}

Create well-structured notes with:
- Clear headings and subheadings
- Key concepts highlighted
- Important details organized logically
- Learning objectives if applicable

Format as clean HTML with proper structure.`;

    const keyPointsPrompt = `Extract the key learning points from this YouTube video content. List the most important concepts, facts, and takeaways.

Video: ${title}
Content: ${transcript}

Your Response (Must be only a list of points starting with '* '):
* `;

    const flashcardsPrompt = `You are CardCrafter, an expert system for creating 15-25 high-quality study flashcards from YouTube video content.

MANDATORY FORMATTING (NO DEVIATIONS):
1. BLOCK SEPARATOR: Each flashcard block MUST be separated by a single line with exactly: \`---FLASHCARD_DIVIDER---\`
2. FLASHCARD FORMAT: Every block must use this exact multi-line structure:
   Front: [Text for the front of the card]
   Back: [Text for the back of the card]
3. NO EXTRA TEXT: Your response must begin directly with "Front:".

Video: ${title}
Content: ${transcript}

Create flashcards covering the main concepts, definitions, and important details from the video.`;

    const questionsPrompt = `Create 8-12 multiple choice questions to test understanding of this YouTube video content.

Video: ${title}
Content: ${transcript}

Format each question as:
Question: [Question text]
A) [Option A]
B) [Option B] 
C) [Option C]
D) [Option D]
Correct: [A, B, C, or D]
Explanation: [Brief explanation]

Topic: [Topic name]
---QUESTION_DIVIDER---`;

    // Make parallel AI calls
    const aiCalls = [
      { prompt: titlePrompt, type: 'title' },
      { prompt: contentPrompt, type: 'content' },
      { prompt: keyPointsPrompt, type: 'keyPoints' },
      { prompt: flashcardsPrompt, type: 'flashcards' },
      { prompt: questionsPrompt, type: 'questions' }
    ];

    const aiResults: Record<string, string> = {};
    
    // Process AI calls in parallel
    const promises = aiCalls.map(async (call) => {
      try {
        const taskMasterApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        
        const requestBody = {
          contents: [{ parts: [{ text: call.prompt }] }],
          generationConfig: {
            temperature: call.type === 'title' ? 0.3 : call.type === 'content' ? 0.6 : 0.5,
            maxOutputTokens: call.type === 'content' ? 16384 : call.type === 'flashcards' ? 16384 : 8192
          }
        };

        const response = await fetch(taskMasterApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `TaskMaster-YouTube-Backend/1.0 (uid:${uid.substring(0,8)})`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Extract text from response
        let text = '';
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = result.candidates[0].content.parts[0].text;
        } else if (result.candidates?.[0]?.finishReason === "MAX_TOKENS") {
          text = "Error: Response was truncated due to length limits. Please try with shorter content.";
        } else {
          text = "Error: No text found in AI response.";
        }

        return { type: call.type, result: text };
      } catch (error) {
        console.error(`AI call failed for ${call.type}:`, error);
        return { 
          type: call.type, 
          result: call.type === 'title' ? 'YouTube Video Notes' : 
                 call.type === 'content' ? '<p>Content generation failed. Please try again.</p>' :
                 call.type === 'keyPoints' ? '* Content processing failed\n* Please try again' :
                 call.type === 'flashcards' ? 'Front: Content processing failed\nBack: Please try again' :
                 'Question: Content processing failed\nA) Try again\nB) Contact support\nC) Check connection\nD) Verify account\nCorrect: A\nExplanation: Please try processing again.'
        };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ type, result }) => {
      aiResults[type] = result;
    });

    // Process results
    const processedTitle = aiResults.title.replace(/["']/g, "").trim() || title;
    const processedContent = aiResults.content.startsWith("Error:") ? 
      `<p><strong>Error generating note:</strong> ${aiResults.content}</p>` : 
      aiResults.content;

    // Parse flashcards
    const flashcards: { front: string; back: string }[] = [];
    if (!aiResults.flashcards.startsWith("Error:")) {
      const flashcardBlocks = aiResults.flashcards.split('---FLASHCARD_DIVIDER---');
      for (const block of flashcardBlocks) {
        const lines = block.trim().split('\n');
        let front = '';
        let back = '';
        let currentSection = '';
        
        for (const line of lines) {
          if (line.startsWith('Front:')) {
            currentSection = 'front';
            front = line.replace('Front:', '').trim();
          } else if (line.startsWith('Back:')) {
            currentSection = 'back';
            back = line.replace('Back:', '').trim();
          } else if (line.trim() && currentSection) {
            if (currentSection === 'front') front += ' ' + line.trim();
            if (currentSection === 'back') back += ' ' + line.trim();
          }
        }
        
        if (front && back) {
          flashcards.push({ front: front.trim(), back: back.trim() });
        }
      }
    }

    // Parse questions
    const questions: any[] = [];
    if (!aiResults.questions.startsWith("Error:")) {
      const questionBlocks = aiResults.questions.split('---QUESTION_DIVIDER---');
      for (const block of questionBlocks) {
        const lines = block.trim().split('\n');
        let question = '';
        const options: string[] = [];
        let correctAnswer = 0;
        let explanation = '';
        let topic = '';
        
        for (const line of lines) {
          if (line.startsWith('Question:')) {
            question = line.replace('Question:', '').trim();
          } else if (line.match(/^[A-D]\)/)) {
            options.push(line.substring(2).trim());
          } else if (line.startsWith('Correct:')) {
            const correctLetter = line.replace('Correct:', '').trim();
            correctAnswer = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
          } else if (line.startsWith('Explanation:')) {
            explanation = line.replace('Explanation:', '').trim();
          } else if (line.startsWith('Topic:')) {
            topic = line.replace('Topic:', '').trim();
          }
        }
        
        if (question && options.length === 4) {
          questions.push({
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            question,
            options,
            correctAnswer,
            explanation,
            topic: topic || 'General',
            hint: ''
          });
        }
      }
    }

    // Parse key points
    const keyPoints = aiResults.keyPoints.startsWith("Error:") ? 
      ['Content processing failed', 'Please try again'] :
      aiResults.keyPoints.split('\n')
        .filter(line => line.trim().startsWith('*'))
        .map(line => line.replace(/^\*\s*/, '').trim())
        .filter(point => point.length > 0);

    return {
      success: true,
      data: {
        title: processedTitle,
        content: processedContent,
        keyPoints,
        flashcards,
        questions,
        topics: questions.length > 0 ? [{ id: 'general', name: 'General', description: 'General topics from the video' }] : [],
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        videoMetadata: {
          title,
          channelTitle,
          description,
          duration,
          videoId
        }
      }
    };

  } catch (error: any) {
    console.error("YouTube processing error:", error);
    throw new functionsV1.https.HttpsError("internal", `YouTube processing failed: ${sanitizeErrorMessage(error)}`);
  }
});
