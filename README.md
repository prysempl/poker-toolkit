# ♠ Poker Toolkit — Full Setup Guide

Everything you need to launch your $8.97/month poker subscription app.

---

## What's in this project

```
poker-toolkit-backend/
├── server.js          → Backend API (auth + Stripe subscriptions + webhooks)
├── api-client.js      → Frontend helper to call the API from React
├── package.json       → Dependencies
├── .env.example       → Environment variables template
└── README.md          → This file
```

Plus your existing `poker-toolkit.jsx` frontend.

---

## Step 1: Create your Stripe account (10 minutes)

1. Go to **https://dashboard.stripe.com/register**
2. Sign up with your personal details (no business needed)
3. Confirm your email

### Get your API keys
1. In the Stripe Dashboard, click **Developers** → **API keys**
2. Copy your **Secret key** (starts with `sk_test_...`)
3. You'll also see a **Publishable key** (starts with `pk_test_...`) — save this too

### Create your subscription products
1. Go to **Products** → **Add product**
2. Create a product called **"Poker Toolkit Pro"**
3. Add two prices:
   - **Monthly**: £8.97 / month (recurring)
   - **Annual**: £67.97 / year (recurring)
4. After creating each price, copy the **Price ID** (starts with `price_...`)

### Set up the webhook
1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Set the URL to: `https://your-domain.com/webhook`
3. Select these events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click **Add endpoint**, then copy the **Signing secret** (starts with `whsec_...`)

### Enable the Customer Portal
1. Go to **Settings** → **Billing** → **Customer portal**
2. Turn on: "Allow customers to cancel subscriptions"
3. Turn on: "Allow customers to update payment methods"
4. Save

---

## Step 2: Set up the backend (15 minutes)

### Install dependencies
```bash
cd poker-toolkit-backend
npm install
```

### Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` and fill in your values:
```
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_PRICE_MONTHLY=price_your_monthly_id
STRIPE_PRICE_ANNUAL=price_your_annual_id
JWT_SECRET=any-long-random-string-here
FRONTEND_URL=http://localhost:3000
PORT=4000
```

### Run it locally
```bash
npm run dev
```

You should see:
```
♠ Poker Toolkit API running on port 4000
```

### Test it
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Step 3: Connect the frontend (10 minutes)

### How the subscription flow works

1. **User signs up** → `POST /auth/signup` → creates account + Stripe customer
2. **User clicks subscribe** → `POST /subscribe/checkout` → returns a Stripe Checkout URL
3. **Redirect user to that URL** → Stripe handles the payment page
4. **Stripe sends webhook** → `POST /webhook` → updates user's subscription status
5. **Frontend checks status** → `GET /subscribe/status` → `{ isPro: true }`

### Update your React paywall

Replace the demo `handleSubscribe` in your `poker-toolkit.jsx` with real API calls.
Here's what the key parts look like:

```jsx
import { signup, login, createCheckout, getSubscriptionStatus, getMe } from './api-client';

// In your Paywall component's subscribe button:
const handleSubscribe = async () => {
  try {
    // 1. Create account (or login if they already have one)
    await signup(email, password);
    
    // 2. Create Stripe Checkout session
    const { url } = await createCheckout(annual ? "annual" : "monthly");
    
    // 3. Redirect to Stripe's payment page
    window.location.href = url;
  } catch (err) {
    setError(err.message);
  }
};

// After they return from Stripe (on your /success page):
useEffect(() => {
  async function checkSub() {
    const { isPro } = await getSubscriptionStatus();
    if (isPro) {
      setSubscribed(true);
    }
  }
  checkSub();
}, []);
```

---

## Step 4: Deploy (20 minutes)

### Backend → Railway (recommended, free tier available)

1. Go to **https://railway.app** and sign up
2. Click **New Project** → **Deploy from GitHub**
3. Push your backend code to a GitHub repo first
4. Railway will auto-detect Node.js
5. Add your environment variables in Railway's dashboard
6. Railway gives you a URL like `https://poker-api.up.railway.app`
7. Update your webhook URL in Stripe to this new URL + `/webhook`

### Frontend → Vercel (free tier)

1. Go to **https://vercel.com** and sign up
2. Push your frontend to GitHub
3. Import the repo in Vercel
4. Add environment variable: `REACT_APP_API_URL=https://poker-api.up.railway.app`
5. Deploy — Vercel gives you a URL like `https://poker-toolkit.vercel.app`
6. Update `FRONTEND_URL` in Railway to match your Vercel URL

### Domain (optional but recommended)

Buy a domain (e.g., `pokertoolkit.app`) from Namecheap or Google Domains (~£10/year)
and point it to your Vercel deployment.

---

## Step 5: Go live with real payments

Once everything works in test mode:

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Get your live API keys and price IDs
3. Update your environment variables on Railway
4. Create a new live webhook endpoint
5. Done — you're accepting real payments

---

## Database upgrade (when you're ready)

The backend currently uses in-memory storage (data resets when the server restarts).
For production, swap in a real database:

**Easiest option: Supabase (free tier)**
1. Create a project at https://supabase.com
2. Create a `users` table with columns matching the user object in server.js
3. Replace the `users` Map with Supabase queries

**Other options:** Firebase, PlanetScale, Neon (PostgreSQL)

---

## Costs summary

| Service | Cost |
|---------|------|
| Stripe | 1.4% + 20p per UK transaction |
| Railway (backend) | Free tier, then ~$5/month |
| Vercel (frontend) | Free tier |
| Domain | ~£10/year |
| **Total overhead** | **~£5/month + Stripe fees** |

At $8.97/month per subscriber, you profit from subscriber #1.

---

## Testing checklist

- [ ] Sign up creates account and Stripe customer
- [ ] Checkout redirects to Stripe payment page
- [ ] 3-day trial activates without charging
- [ ] After trial, card gets charged $8.97
- [ ] Webhook updates subscription status to "active"
- [ ] Frontend correctly shows Pro features
- [ ] Customer portal lets users cancel
- [ ] Cancellation webhook updates status to "canceled"
- [ ] Canceled users lose access to Pro features
- [ ] Failed payments set status to "past_due"

Use Stripe's test card: `4242 4242 4242 4242` (any future date, any CVC)

---

## Need help?

- **Stripe docs**: https://stripe.com/docs/billing/subscriptions
- **Railway docs**: https://docs.railway.app
- **Vercel docs**: https://vercel.com/docs

Good luck with the launch! ♠
