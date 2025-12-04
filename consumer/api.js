const express = require('express');
const MultiTopicConsumer = require('./index');
const logger = require('../config/logger');

const app = express();
const PORT = process.env.CONSUMER_API_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Consumer state
let consumer;
let isConsumerReady = false;
let isPaused = false;
let stats = {
  messagesProcessed: 0,
  errors: 0,
  startTime: null,
  lastMessageTime: null,
  messagesByTopic: {}
};

// Initialize consumer
async function initializeConsumer() {
  try {
    consumer = new MultiTopicConsumer();
    
    // Wrap handlers to track statistics
    const originalHandleOrder = consumer.handleOrderEvent.bind(consumer);
    const originalHandleUser = consumer.handleUserEvent.bind(consumer);
    const originalHandleNotification = consumer.handleNotificationEvent.bind(consumer);
    
    consumer.handleOrderEvent = async (message) => {
      try {
        await originalHandleOrder(message);
        updateStats('orders', true);
      } catch (error) {
        updateStats('orders', false);
        throw error;
      }
    };
    
    consumer.handleUserEvent = async (message) => {
      try {
        await originalHandleUser(message);
        updateStats('users', true);
      } catch (error) {
        updateStats('users', false);
        throw error;
      }
    };
    
    consumer.handleNotificationEvent = async (message) => {
      try {
        await originalHandleNotification(message);
        updateStats('notifications', true);
      } catch (error) {
        updateStats('notifications', false);
        throw error;
      }
    };
    
    await consumer.initialize();
    await consumer.start();
    
    isConsumerReady = true;
    stats.startTime = new Date().toISOString();
    logger.info('Consumer API: Kafka consumer initialized and started');
  } catch (error) {
    logger.error('Consumer API: Failed to initialize Kafka consumer:', error);
    isConsumerReady = false;
  }
}

// Update statistics
function updateStats(topic, success) {
  if (success) {
    stats.messagesProcessed++;
    stats.lastMessageTime = new Date().toISOString();
    
    if (!stats.messagesByTopic[topic]) {
      stats.messagesByTopic[topic] = 0;
    }
    stats.messagesByTopic[topic]++;
  } else {
    stats.errors++;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    consumerReady: isConsumerReady,
    isPaused: isPaused,
    timestamp: new Date().toISOString()
  });
});

// GET /api/stats - Get consumer statistics
app.get('/api/stats', (req, res) => {
  try {
    const uptime = stats.startTime 
      ? Math.floor((new Date() - new Date(stats.startTime)) / 1000)
      : 0;
    
    const avgMessagesPerSecond = uptime > 0 
      ? (stats.messagesProcessed / uptime).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        uptime: `${uptime} seconds`,
        averageMessagesPerSecond: parseFloat(avgMessagesPerSecond),
        isPaused: isPaused,
        consumerReady: isConsumerReady
      }
    });
  } catch (error) {
    logger.error('Consumer API: Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get consumer statistics'
    });
  }
});

// GET /api/consumer-groups - Get consumer group information
app.get('/api/consumer-groups', async (req, res) => {
  try {
    if (!isConsumerReady || !consumer) {
      return res.status(503).json({
        success: false,
        error: 'Consumer service is not ready'
      });
    }

    // Get consumer group information from the Kafka consumer
    const groupId = consumer.consumer.groupId;
    const topics = ['orders', 'users', 'notifications'];

    res.status(200).json({
      success: true,
      data: {
        groupId: groupId,
        subscribedTopics: topics,
        status: isPaused ? 'paused' : 'running',
        memberInfo: {
          isConnected: isConsumerReady,
          isPaused: isPaused
        }
      }
    });
  } catch (error) {
    logger.error('Consumer API: Error getting consumer group info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get consumer group information'
    });
  }
});

// POST /api/consumer/pause - Pause consumption
app.post('/api/consumer/pause', async (req, res) => {
  try {
    if (!isConsumerReady || !consumer) {
      return res.status(503).json({
        success: false,
        error: 'Consumer service is not ready'
      });
    }

    if (isPaused) {
      return res.status(400).json({
        success: false,
        error: 'Consumer is already paused'
      });
    }

    await consumer.consumer.pause();
    isPaused = true;
    
    logger.info('Consumer API: Consumer paused via API');
    
    res.status(200).json({
      success: true,
      message: 'Consumer paused successfully',
      data: {
        isPaused: true,
        pausedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Consumer API: Error pausing consumer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pause consumer'
    });
  }
});

// POST /api/consumer/resume - Resume consumption
app.post('/api/consumer/resume', async (req, res) => {
  try {
    if (!isConsumerReady || !consumer) {
      return res.status(503).json({
        success: false,
        error: 'Consumer service is not ready'
      });
    }

    if (!isPaused) {
      return res.status(400).json({
        success: false,
        error: 'Consumer is not paused'
      });
    }

    await consumer.consumer.resume();
    isPaused = false;
    
    logger.info('Consumer API: Consumer resumed via API');
    
    res.status(200).json({
      success: true,
      message: 'Consumer resumed successfully',
      data: {
        isPaused: false,
        resumedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Consumer API: Error resuming consumer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resume consumer'
    });
  }
});

// POST /api/stats/reset - Reset statistics
app.post('/api/stats/reset', (req, res) => {
  try {
    stats = {
      messagesProcessed: 0,
      errors: 0,
      startTime: new Date().toISOString(),
      lastMessageTime: null,
      messagesByTopic: {}
    };
    
    logger.info('Consumer API: Statistics reset via API');
    
    res.status(200).json({
      success: true,
      message: 'Statistics reset successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Consumer API: Error resetting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset statistics'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Consumer API: Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
async function startServer() {
  // Start the API server first
  app.listen(PORT, () => {
    logger.info(`Consumer API server running on port ${PORT}`);
    console.log(`🚀 Consumer API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Statistics: http://localhost:${PORT}/api/stats`);
  });
  
  // Initialize consumer after server starts
  await initializeConsumer();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Consumer API: Shutting down gracefully...');
  if (consumer) {
    await consumer.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Consumer API: Shutting down gracefully...');
  if (consumer) {
    await consumer.shutdown();
  }
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Consumer API: Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;
