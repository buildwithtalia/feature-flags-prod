const EventProducer = require('./index');
const logger = require('../config/logger');

async function generateTestEvents() {
  const eventProducer = new EventProducer();
  
  try {
    await eventProducer.initialize();
    logger.info('Starting test event generation...');
    
    // Generate multiple order events
    for (let i = 1; i <= 5; i++) {
      await eventProducer.publishOrderEvent({
        userId: `user-${i}`,
        eventType: 'ORDER_CREATED',
        items: [
          { productId: `prod-${i}`, quantity: i, price: 19.99 * i }
        ],
        totalAmount: 19.99 * i * i,
        status: 'PENDING'
      });
      
      logger.info(`Published order event ${i}/5`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Generate multiple user events
    for (let i = 1; i <= 3; i++) {
      await eventProducer.publishUserEvent({
        eventType: 'USER_CREATED',
        email: `testuser${i}@example.com`,
        firstName: `Test${i}`,
        lastName: `User${i}`,
        phoneNumber: `+123456789${i}`
      });
      
      logger.info(`Published user event ${i}/3`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Generate notification events
    for (let i = 1; i <= 3; i++) {
      await eventProducer.publishNotification({
        type: 'EMAIL',
        recipient: `user-${i}`,
        subject: `Test Notification ${i}`,
        message: `This is test notification number ${i}`,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Published notification event ${i}/3`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logger.info('Test event generation completed successfully');
  } catch (error) {
    logger.error('Error generating test events:', error);
  } finally {
    await eventProducer.shutdown();
  }
}

generateTestEvents();
