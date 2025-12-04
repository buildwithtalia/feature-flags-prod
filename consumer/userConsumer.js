const KafkaConsumer = require('./kafkaConsumer');
const { topics } = require('../config/kafka.config');
const logger = require('../config/logger');

class UserConsumer {
  constructor() {
    this.consumer = new KafkaConsumer('user-consumer-group');
  }

  async initialize() {
    await this.consumer.connect();
    await this.consumer.subscribe(topics.USERS);
    
    this.consumer.registerHandler(topics.USERS, this.handleUserEvent.bind(this));
    
    logger.info('User Consumer initialized');
  }

  async handleUserEvent(message) {
    const { value, key, offset, partition } = message;
    
    try {
      logger.info(`Processing user event: ${key}`, value);
      
      // Simulate user event processing logic
      switch (value.eventType) {
        case 'USER_CREATED':
          await this.processNewUser(value);
          break;
        case 'USER_UPDATED':
          await this.processUserUpdate(value);
          break;
        case 'USER_DELETED':
          await this.processUserDeletion(value);
          break;
        default:
          logger.warn(`Unknown user event type: ${value.eventType}`);
      }
      
      logger.info(`User event processed successfully: ${key}`);
    } catch (error) {
      logger.error(`Error processing user event ${key}:`, error);
      throw error;
    }
  }

  async processNewUser(userData) {
    logger.info(`Processing new user: ${userData.userId}`);
    
    // Example business logic:
    // 1. Create user profile
    // 2. Send welcome email
    // 3. Set up default preferences
    // 4. Trigger onboarding workflow
    
    await this.simulateProcessing(800);
    
    logger.info(`New user processed: ${userData.userId}`, {
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`
    });
    
    // Simulate sending welcome notification
    await this.sendWelcomeNotification(userData);
  }

  async processUserUpdate(userData) {
    logger.info(`Processing user update: ${userData.userId}`);
    
    // Example business logic:
    // 1. Update user profile
    // 2. Sync with external systems
    // 3. Update search index
    
    await this.simulateProcessing(500);
    
    logger.info(`User update processed: ${userData.userId}`);
  }

  async processUserDeletion(userData) {
    logger.info(`Processing user deletion: ${userData.userId}`);
    
    // Example business logic:
    // 1. Anonymize user data
    // 2. Cancel subscriptions
    // 3. Remove from mailing lists
    // 4. Archive user records
    
    await this.simulateProcessing(1000);
    
    logger.info(`User deletion processed: ${userData.userId}`);
  }

  async sendWelcomeNotification(userData) {
    logger.info(`Sending welcome notification to: ${userData.email}`);
    
    // In a real application, this would trigger a notification event
    // or call an email service
    
    await this.simulateProcessing(300);
  }

  async simulateProcessing(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async start() {
    await this.consumer.run();
  }

  async shutdown() {
    await this.consumer.disconnect();
    logger.info('User Consumer shut down');
  }
}

// Run the consumer
async function main() {
  const userConsumer = new UserConsumer();
  
  try {
    await userConsumer.initialize();
    await userConsumer.start();
    
    logger.info('User Consumer is running...');
  } catch (error) {
    logger.error('Error in User Consumer:', error);
    await userConsumer.shutdown();
    process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down User Consumer...');
    await userConsumer.shutdown();
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = UserConsumer;
