// ──────────────────────────────────────────────────
// Poker Toolkit — Backend Server
// Handles: Auth, Stripe subscriptions, webhooks
// ──────────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// ─── MIDDLEWARE ───
// Raw body needed for Stripe webhooks (must come before json parser for /webhook)
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ─── IN-MEMORY DATABASE ───
// Replace with a real database (Supabase, Firebase, PostgreSQL) for production
const users = new Map(); // email -> { id, email, passwordHash, stripeCustomerId, subscriptionStatus, subscriptionId, createdAt }
const sessions = new Map(); // token -> { userId, email }

// ─── HELPERS ───
const JWT_SECRET = process.env.JWT_SECRET || "change-this-to-a-random-secret-in-production";
const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY; // Stripe Price ID for $8.97/mo
const PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL; // Stripe Price ID for $67.97/yr

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.get(decoded.email);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ──────────────────────────────────────────────────
// AUTH ROUTES
// ──────────────────────────────────────────────────

// POST /auth/signup
app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    if (users.has(email)) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({ email });

    // Hash password & store user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: `user_${Date.now()}`,
      email,
      passwordHash,
      stripeCustomerId: customer.id,
      subscriptionStatus: "free", // free | trialing | active | canceled | past_due
      subscriptionId: null,
      createdAt: new Date().toISOString(),
    };

    users.set(email, user);

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.get(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /auth/me — check current user & subscription status
app.get("/auth/me", authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      subscriptionStatus: req.user.subscriptionStatus,
    },
  });
});

// ──────────────────────────────────────────────────
// STRIPE SUBSCRIPTION ROUTES
// ──────────────────────────────────────────────────

// POST /subscribe/checkout — create a Stripe Checkout session
app.post("/subscribe/checkout", authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body; // "monthly" or "annual"
    const priceId = plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;

    if (!priceId) {
      return res.status(400).json({ error: "Price not configured" });
    }

    const session = await stripe.checkout.sessions.create({
      customer: req.user.stripeCustomerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 3, // 3-day free trial
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/`,
      metadata: {
        userId: req.user.id,
        userEmail: req.user.email,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /subscribe/portal — open Stripe Customer Portal (manage/cancel sub)
app.post("/subscribe/portal", authenticateToken, async (req, res) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

// GET /subscribe/status — check subscription status
app.get("/subscribe/status", authenticateToken, (req, res) => {
  res.json({
    subscriptionStatus: req.user.subscriptionStatus,
    isPro:
      req.user.subscriptionStatus === "active" ||
      req.user.subscriptionStatus === "trialing",
  });
});

// ──────────────────────────────────────────────────
// STRIPE WEBHOOK
// This is the most critical part — Stripe tells us
// when payments succeed, fail, or get canceled
// ──────────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    // ── Trial started or subscription created ──
    case "customer.subscription.created": {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      updateUserSubscription(customerId, {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status === "trialing" ? "trialing" : "active",
      });
      console.log(`✓ Subscription created for customer ${customerId}`);
      break;
    }

    // ── Subscription updated (trial ended, payment method changed, etc.) ──
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status; // active, past_due, canceled, trialing, etc.
      updateUserSubscription(customerId, {
        subscriptionId: subscription.id,
        subscriptionStatus: status,
      });
      console.log(`✓ Subscription updated for customer ${customerId}: ${status}`);
      break;
    }

    // ── Subscription deleted/canceled ──
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      updateUserSubscription(customerId, {
        subscriptionId: null,
        subscriptionStatus: "canceled",
      });
      console.log(`✓ Subscription canceled for customer ${customerId}`);
      break;
    }

    // ── Payment succeeded (renewal) ──
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      console.log(`✓ Payment succeeded for customer ${invoice.customer}: £${(invoice.amount_paid / 100).toFixed(2)}`);
      break;
    }

    // ── Payment failed ──
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      updateUserSubscription(customerId, { subscriptionStatus: "past_due" });
      console.log(`✗ Payment failed for customer ${customerId}`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Helper: find user by Stripe customer ID and update their subscription
function updateUserSubscription(stripeCustomerId, updates) {
  for (const [email, user] of users.entries()) {
    if (user.stripeCustomerId === stripeCustomerId) {
      Object.assign(user, updates);
      users.set(email, user);
      return true;
    }
  }
  console.warn(`No user found with Stripe customer ID: ${stripeCustomerId}`);
  return false;
}

// ──────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`
  ♠ Poker Toolkit API running on port ${PORT}
  
  Endpoints:
    POST /auth/signup          — Create account
    POST /auth/login           — Log in
    GET  /auth/me              — Check auth status
    POST /subscribe/checkout   — Start Stripe checkout
    POST /subscribe/portal     — Manage subscription
    GET  /subscribe/status     — Check sub status
    POST /webhook              — Stripe webhooks
    GET  /health               — Health check
  `);
});
