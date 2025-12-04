const KafkaProducer = require('./kafkaProducer');
const OrderEvent = require('../schemas/orderSchema');
const UserEvent = require('../schemas/userSchema');
const { topics } = require('../config/kafka.config');
const logger = require('../config/logger');

class EventProducer {
  constructor() {
    this.producer = new KafkaProducer();
  }

  async initialize() {
    await this.producer.connect();
    logger.info('Event Producer initialized');
  }

  async publishOrderEvent(orderData) {
    try {
      const orderEvent = new OrderEvent(orderData);
      orderEvent.validate();
      
      await this.producer.sendMessage(
        topics.ORDERS,
        orderEvent.toJSON(),
        orderEvent.orderId
      );
      
      logger.info(`Order event published: ${orderEvent.orderId}`);
      return orderEvent;
    } catch (error) {
      logger.error('Error publishing order event:', error);
      throw error;
    }
  }

  async publishUserEvent(userData) {
    try {
      const userEvent = new UserEvent(userData);
      userEvent.validate();
      
      await this.producer.sendMessage(
        topics.USERS,
        userEvent.toJSON(),
        userEvent.userId
      );
      
      logger.info(`User event published: ${userEvent.userId}`);
      return userEvent;
    } catch (error) {
      logger.error('Error publishing user event:', error);
      throw error;
    }
  }

  async publishNotification(notificationData) {
    try {
      await this.producer.sendMessage(
        topics.NOTIFICATIONS,
        notificationData
      );
      
      logger.info('Notification event published');
      return notificationData;
    } catch (error) {
      logger.error('Error publishing notification:', error);
      throw error;
    }
  }

  async shutdown() {
    await this.producer.disconnect();
    logger.info('Event Producer shut down');
  }
}

// Example usage
async function main() {
  const eventProducer = new EventProducer();
  
  try {
    await eventProducer.initialize();
    
    // Example: Publish order event
    await eventProducer.publishOrderEvent({
      userId: 'user-123',
      items: [
        { productId: 'prod-1', quantity: 2, price: 29.99 },
        { productId: 'prod-2', quantity: 1, price: 49.99 }
      ],
      totalAmount: 109.97,
      shippingAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102'
      }
    });
    
    // Example: Publish user event
    await eventProducer.publishUserEvent({
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890'
    });
    
    logger.info('Sample events published successfully');
  } catch (error) {
    logger.error('Error in main:', error);
  } finally {
    await eventProducer.shutdown();
  }
}

if (require.main === module) {
  main();
}

module.exports = EventProducer;
