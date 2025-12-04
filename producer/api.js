const express = require('express');
const EventProducer = require('./index');
const logger = require('../config/logger');

const app = express();
const PORT = process.env.PRODUCER_API_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize producer
let eventProducer;
let isProducerReady = false;

async function initializeProducer() {
  try {
    eventProducer = new EventProducer();
    await eventProducer.initialize();
    isProducerReady = true;
    logger.info('Producer API: Kafka producer initialized');
  } catch (error) {
    logger.error('Producer API: Failed to initialize Kafka producer:', error);
    isProducerReady = false;
  }
}

// Middleware to check producer readiness
const checkProducerReady = (req, res, next) => {
  if (!isProducerReady) {
    return res.status(503).json({
      success: false,
      error: 'Producer service is not ready. Please try again later.'
    });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    producerReady: isProducerReady,
    timestamp: new Date().toISOString()
  });
});

// POST /api/events/orders - Publish order events
app.post('/api/events/orders', checkProducerReady, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate required fields
    if (!orderData.userId || !orderData.items || !orderData.totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, items, and totalAmount are required'
      });
    }

    const orderEvent = await eventProducer.publishOrderEvent(orderData);
    
    logger.info(`Producer API: Order event published via API: ${orderEvent.orderId}`);
    
    res.status(201).json({
      success: true,
      message: 'Order event published successfully',
      data: orderEvent.toJSON()
    });
  } catch (error) {
    logger.error('Producer API: Error publishing order event:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish order event'
    });
  }
});

// POST /api/events/users - Publish user events
app.post('/api/events/users', checkProducerReady, async (req, res) => {
  try {
    const userData = req.body;
    
    // Validate required fields
    if (!userData.email || !userData.firstName || !userData.lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, and lastName are required'
      });
    }

    const userEvent = await eventProducer.publishUserEvent(userData);
    
    logger.info(`Producer API: User event published via API: ${userEvent.userId}`);
    
    res.status(201).json({
      success: true,
      message: 'User event published successfully',
      data: userEvent.toJSON()
    });
  } catch (error) {
    logger.error('Producer API: Error publishing user event:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish user event'
    });
  }
});

// POST /api/events/notifications - Publish notification events
app.post('/api/events/notifications', checkProducerReady, async (req, res) => {
  try {
    const notificationData = req.body;
    
    // Validate required fields
    if (!notificationData.type || !notificationData.recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type and recipient are required'
      });
    }

    const notification = await eventProducer.publishNotification(notificationData);
    
    logger.info('Producer API: Notification event published via API');
    
    res.status(201).json({
      success: true,
      message: 'Notification event published successfully',
      data: notification
    });
  } catch (error) {
    logger.error('Producer API: Error publishing notification event:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish notification event'
    });
  }
});

// POST /api/events/payments - Publish payment events
app.post('/api/events/payments', checkProducerReady, async (req, res) => {
  try {
    const paymentData = req.body;
    
    // Validate required fields
    if (!paymentData.orderId || !paymentData.amount || !paymentData.paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, amount, and paymentMethod are required'
      });
    }

    // Add timestamp and eventId if not present
    const enrichedPaymentData = {
      eventId: paymentData.eventId || require('uuid').v4(),
      timestamp: paymentData.timestamp || new Date().toISOString(),
      ...paymentData
    };

    await eventProducer.producer.sendMessage(
      'payments',
      enrichedPaymentData,
      paymentData.orderId
    );
    
    logger.info(`Producer API: Payment event published via API for order: ${paymentData.orderId}`);
    
    res.status(201).json({
      success: true,
      message: 'Payment event published successfully',
      data: enrichedPaymentData
    });
  } catch (error) {
    logger.error('Producer API: Error publishing payment event:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish payment event'
    });
  }
});

// POST /api/events/batch - Publish multiple events at once
app.post('/api/events/batch', checkProducerReady, async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'events array is required and must not be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const event of events) {
      try {
        const { type, data } = event;
        
        if (!type || !data) {
          errors.push({
            event,
            error: 'Each event must have type and data fields'
          });
          continue;
        }

        let result;
        switch (type) {
          case 'order':
            result = await eventProducer.publishOrderEvent(data);
            results.push({ type, eventId: result.orderId, status: 'success' });
            break;
          case 'user':
            result = await eventProducer.publishUserEvent(data);
            results.push({ type, eventId: result.userId, status: 'success' });
            break;
          case 'notification':
            result = await eventProducer.publishNotification(data);
            results.push({ type, status: 'success' });
            break;
          case 'payment':
            const enrichedData = {
              eventId: data.eventId || require('uuid').v4(),
              timestamp: data.timestamp || new Date().toISOString(),
              ...data
            };
            await eventProducer.producer.sendMessage('payments', enrichedData, data.orderId);
            results.push({ type, eventId: data.orderId, status: 'success' });
            break;
          default:
            errors.push({
              event,
              error: `Unknown event type: ${type}. Supported types: order, user, notification, payment`
            });
        }
      } catch (error) {
        errors.push({
          event,
          error: error.message
        });
      }
    }

    logger.info(`Producer API: Batch publish completed - ${results.length} successful, ${errors.length} failed`);

    res.status(errors.length === events.length ? 500 : 200).json({
      success: errors.length < events.length,
      message: `Processed ${events.length} events: ${results.length} successful, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('Producer API: Error in batch publish:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process batch events'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Producer API: Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
async function startServer() {
  await initializeProducer();
  
  app.listen(PORT, () => {
    logger.info(`Producer API server running on port ${PORT}`);
    console.log(`🚀 Producer API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Producer API: Shutting down gracefully...');
  if (eventProducer) {
    await eventProducer.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Producer API: Shutting down gracefully...');
  if (eventProducer) {
    await eventProducer.shutdown();
  }
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Producer API: Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;
