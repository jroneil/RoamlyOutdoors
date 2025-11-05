import express from 'express';
import cors from 'cors';
import billingRouter from './routes/billing.js';
import stripeWebhookHandler from './routes/stripeWebhook.js';

const app = express();

app.use(cors());

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use(express.json());
app.use('/api/billing', billingRouter);

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT ?? 5001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Billing API listening on port ${port}`);
  });
}

export default app;
