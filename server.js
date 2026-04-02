// ──────────────────────────────────────────────────
// Poker Toolkit — Backend Server (with Supabase)
// ──────────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ─── SUPABASE ───
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── MIDDLEWARE ───
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ─── HELPERS ───
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";
const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
const PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL;

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userEmail = decoded.email;
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Helper to get user from Supabase
async function getUser(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  if (error) return null;
  return data;
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

    // Check if user already exists
    const existing = await getUser(email);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({ email });

    // Hash password & store in Supabase
    const password_hash = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}`;

    const { data, error } = await supabase.from("users").insert({
      id: userId,
      email,
      password_hash,
      stripe_customer_id: customer.id,
      subscription_status: "free",
      subscription_id: null,
    }).select().single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to create account" });
    }

    const token = generateToken(data);

    res.json({
      token,
      user: {
        id: data.id,
        email: data.email,
        subscriptionStatus: data.subscription_status,
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

    const user = await getUser(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /auth/me
app.get("/auth/me", authenticateToken, async (req, res) => {
  const user = await getUser(req.userEmail);
  if (!user) return res.status(401).json({ error: "User not found" });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      subscriptionStatus: user.subscription_status,
    },
  });
});

// ──────────────────────────────────────────────────
// STRIPE SUBSCRIPTION ROUTES
// ──────────────────────────────────────────────────

// POST /subscribe/checkout
app.post("/subscribe/checkout", authenticateToken, async (req, res) => {
  try {
    const user = await getUser(req.userEmail);
    if (!user) return res.status(401).json({ error: "User not found" });

    const { plan } = req.body;
    const priceId = plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;

    if (!priceId) {
      return res.status(400).json({ error: "Price not configured" });
    }

    const session = await stripe.checkout.sessions.create({
      customer: user.stripe_customer_id,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
      },
      success_url: `${process.env.FRONTEND_URL}/?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}/`,
      metadata: {
        userId: user.id,
        userEmail: user.email,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /subscribe/portal
app.post("/subscribe/portal", authenticateToken, async (req, res) => {
  try {
    const user = await getUser(req.userEmail);
    if (!user) return res.status(401).json({ error: "User not found" });

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

// GET /subscribe/status
app.get("/subscribe/status", authenticateToken, async (req, res) => {
  const user = await getUser(req.userEmail);
  if (!user) return res.status(401).json({ error: "User not found" });

  res.json({
    subscriptionStatus: user.subscription_status,
    isPro:
      user.subscription_status === "active" ||
      user.subscription_status === "trialing",
  });
});

// ──────────────────────────────────────────────────
// STRIPE WEBHOOK
// ──────────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "customer.subscription.created": {
      const subscription = event.data.object;
      await updateUserByStripeId(subscription.customer, {
        subscription_id: subscription.id,
        subscription_status: subscription.status === "trialing" ? "trialing" : "active",
      });
      console.log(`✓ Subscription created for ${subscription.customer}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      await updateUserByStripeId(subscription.customer, {
        subscription_id: subscription.id,
        subscription_status: subscription.status,
      });
      console.log(`✓ Subscription updated: ${subscription.status}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await updateUserByStripeId(subscription.customer, {
        subscription_id: null,
        subscription_status: "canceled",
      });
      console.log(`✓ Subscription canceled for ${subscription.customer}`);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      console.log(`✓ Payment succeeded: £${(invoice.amount_paid / 100).toFixed(2)}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await updateUserByStripeId(invoice.customer, {
        subscription_status: "past_due",
      });
      console.log(`✗ Payment failed for ${invoice.customer}`);
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
});

// Helper: update user by Stripe customer ID
async function updateUserByStripeId(stripeCustomerId, updates) {
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) {
    console.error("Failed to update user:", error);
    return false;
  }
  return true;
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
  console.log(`♠ Poker Toolkit API running on port ${PORT}`);
});
