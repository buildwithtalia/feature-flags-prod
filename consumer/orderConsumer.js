const KafkaConsumer = require('./kafkaConsumer');
const { topics } = require('../config/kafka.config');
const logger = require('../config/logger');

class OrderConsumer {
  constructor() {
    this.consumer = new KafkaConsumer('order-consumer-group');
  }

  async initialize() {
    await this.consumer.connect();
    await this.consumer.subscribe(topics.ORDERS);
    
    this.consumer.registerHandler(topics.ORDERS, this.handleOrderEvent.bind(this));
    
    logger.info('Order Consumer initialized');
  }

  async handleOrderEvent(message) {
    const { value, key, offset, partition } = message;
    
    try {
      logger.info(`Processing order event: ${key}`, value);
      
      // Simulate order processing logic
      switch (value.eventType) {
        case 'ORDER_CREATED':
          await this.processNewOrder(value);
          break;
        case 'ORDER_UPDATED':
          await this.processOrderUpdate(value);
          break;
        case 'ORDER_CANCELLED':
          await this.processOrderCancellation(value);
          break;
        default:
          logger.warn(`Unknown order event type: ${value.eventType}`);
      }
      
      logger.info(`Order event processed successfully: ${key}`);
    } catch (error) {
      logger.error(`Error processing order event ${key}:`, error);
      throw error;
    }
  }

  async processNewOrder(orderData) {
    // Simulate order processing
    logger.info(`Processing new order: ${orderData.orderId}`);
    
    // Example business logic:
    // 1. Validate inventory
    // 2. Calculate shipping
    // 3. Process payment
    // 4. Update order status
    
    await this.simulateProcessing(1000);
    
    logger.info(`New order processed: ${orderData.orderId}`, {
      totalAmount: orderData.totalAmount,
      itemCount: orderData.items.length
    });
  }

  async processOrderUpdate(orderData) {
    logger.info(`Processing order update: ${orderData.orderId}`);
    
    // Example business logic:
    // 1. Update order details
    // 2. Notify customer
    // 3. Update inventory
    
    await this.simulateProcessing(500);
    
    logger.info(`Order update processed: ${orderData.orderId}`);
  }

  async processOrderCancellation(orderData) {
    logger.info(`Processing order cancellation: ${orderData.orderId}`);
    
    // Example business logic:
    // 1. Refund payment
    // 2. Restore inventory
    // 3. Notify customer
    
    await this.simulateProcessing(800);
    
    logger.info(`Order cancellation processed: ${orderData.orderId}`);
  }

  async simulateProcessing(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async start() {
    await this.consumer.run();
  }

  async shutdown() {
    await this.consumer.disconnect();
    logger.info('Order Consumer shut down');
  }
}

// Run the consumer
async function main() {
  const orderConsumer = new OrderConsumer();
  
  try {
    await orderConsumer.initialize();
    await orderConsumer.start();
    
    logger.info('Order Consumer is running...');
  } catch (error) {
    logger.error('Error in Order Consumer:', error);
    await orderConsumer.shutdown();
    process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down Order Consumer...');
    await orderConsumer.shutdown();
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = OrderConsumer;
