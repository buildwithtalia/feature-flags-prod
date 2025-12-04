const { Kafka } = require('kafkajs');
const { kafkaConfig, consumerConfig } = require('../config/kafka.config');
const logger = require('../config/logger');

class KafkaConsumer {
  constructor(groupId = null) {
    this.kafka = new Kafka(kafkaConfig);
    this.consumer = this.kafka.consumer({
      ...consumerConfig,
      groupId: groupId || consumerConfig.groupId
    });
    this.isConnected = false;
    this.messageHandlers = new Map();
  }

  async connect() {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      logger.info(`Kafka Consumer connected with group: ${this.consumer.groupId}`);
    } catch (error) {
      logger.error('Failed to connect Kafka Consumer:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka Consumer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka Consumer:', error);
      throw error;
    }
  }

  async subscribe(topics) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const topicArray = Array.isArray(topics) ? topics : [topics];
      
      for (const topic of topicArray) {
        await this.consumer.subscribe({ 
          topic, 
          fromBeginning: false 
        });
        logger.info(`Subscribed to topic: ${topic}`);
      }
    } catch (error) {
      logger.error('Error subscribing to topics:', error);
      throw error;
    }
  }

  registerHandler(topic, handler) {
    this.messageHandlers.set(topic, handler);
    logger.info(`Handler registered for topic: ${topic}`);
  }

  async run() {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const handler = this.messageHandlers.get(topic);
          
          if (!handler) {
            logger.warn(`No handler registered for topic: ${topic}`);
            return;
          }

          try {
            const value = message.value ? JSON.parse(message.value.toString()) : null;
            const key = message.key ? message.key.toString() : null;

            logger.info(`Processing message from topic ${topic}:`, {
              partition,
              offset: message.offset,
              key
            });

            await handler({
              topic,
              partition,
              offset: message.offset,
              key,
              value,
              timestamp: message.timestamp,
              headers: message.headers
            });

            logger.info(`Message processed successfully from topic ${topic}`);
          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
            await this.handleError(topic, message, error);
          }
        }
      });
    } catch (error) {
      logger.error('Error running consumer:', error);
      throw error;
    }
  }

  async handleError(topic, message, error) {
    // Implement error handling logic
    // Could send to dead letter queue, retry, or alert
    logger.error(`Error handling message from ${topic}:`, {
      offset: message.offset,
      error: error.message
    });
    
    // For now, we'll just log the error
    // In production, you might want to:
    // 1. Send to a dead letter queue
    // 2. Implement retry logic
    // 3. Alert monitoring systems
  }

  async commitOffsets(offsets) {
    try {
      await this.consumer.commitOffsets(offsets);
      logger.info('Offsets committed successfully');
    } catch (error) {
      logger.error('Error committing offsets:', error);
      throw error;
    }
  }

  async pause(topics) {
    try {
      this.consumer.pause(topics);
      logger.info('Consumer paused for topics:', topics);
    } catch (error) {
      logger.error('Error pausing consumer:', error);
      throw error;
    }
  }

  async resume(topics) {
    try {
      this.consumer.resume(topics);
      logger.info('Consumer resumed for topics:', topics);
    } catch (error) {
      logger.error('Error resuming consumer:', error);
      throw error;
    }
  }
}

module.exports = KafkaConsumer;
