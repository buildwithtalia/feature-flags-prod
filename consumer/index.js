const KafkaConsumer = require('./kafkaConsumer');
const { topics } = require('../config/kafka.config');
const logger = require('../config/logger');

class MultiTopicConsumer {
  constructor() {
    this.consumer = new KafkaConsumer('multi-topic-consumer-group');
  }

  async initialize() {
    await this.consumer.connect();
    
    // Subscribe to multiple topics
    await this.consumer.subscribe([
      topics.ORDERS,
      topics.USERS,
      topics.NOTIFICATIONS
    ]);
    
    // Register handlers for each topic
    this.consumer.registerHandler(topics.ORDERS, this.handleOrderEvent.bind(this));
    this.consumer.registerHandler(topics.USERS, this.handleUserEvent.bind(this));
    this.consumer.registerHandler(topics.NOTIFICATIONS, this.handleNotificationEvent.bind(this));
    
    logger.info('Multi-Topic Consumer initialized');
  }

  async handleOrderEvent(message) {
    const { value, key } = message;
    logger.info(`[ORDERS] Processing order: ${key}`, {
      orderId: value.orderId,
      totalAmount: value.totalAmount
    });
    
    await this.simulateProcessing(500);
  }

  async handleUserEvent(message) {
    const { value, key } = message;
    logger.info(`[USERS] Processing user: ${key}`, {
      userId: value.userId,
      email: value.email
    });
    
    await this.simulateProcessing(300);
  }

  async handleNotificationEvent(message) {
    const { value } = message;
    logger.info(`[NOTIFICATIONS] Processing notification:`, {
      type: value.type,
      recipient: value.recipient
    });
    
    await this.simulateProcessing(200);
  }

  async simulateProcessing(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async start() {
    await this.consumer.run();
  }

  async shutdown() {
    await this.consumer.disconnect();
    logger.info('Multi-Topic Consumer shut down');
  }
}

// Run the consumer
async function main() {
  const consumer = new MultiTopicConsumer();
  
  try {
    await consumer.initialize();
    await consumer.start();
    
    logger.info('Multi-Topic Consumer is running...');
  } catch (error) {
    logger.error('Error in Multi-Topic Consumer:', error);
    await consumer.shutdown();
    process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down Multi-Topic Consumer...');
    await consumer.shutdown();
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = MultiTopicConsumer;
