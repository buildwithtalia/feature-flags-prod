const { Kafka, Partitioners } = require('kafkajs');
const { kafkaConfig, producerConfig } = require('../config/kafka.config');
const logger = require('../config/logger');

class KafkaProducer {
  constructor() {
    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer({
      ...producerConfig,
      createPartitioner: Partitioners.LegacyPartitioner
    });
    this.isConnected = false;
  }

  async connect() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka Producer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka Producer:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka Producer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka Producer:', error);
      throw error;
    }
  }

  async sendMessage(topic, message, key = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const payload = {
        topic,
        messages: [
          {
            key: key,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      };

      const result = await this.producer.send(payload);
      logger.info(`Message sent to topic ${topic}:`, {
        partition: result[0].partition,
        offset: result[0].offset
      });
      return result;
    } catch (error) {
      logger.error(`Error sending message to topic ${topic}:`, error);
      throw error;
    }
  }

  async sendBatch(topic, messages) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const formattedMessages = messages.map(msg => ({
        key: msg.key || null,
        value: JSON.stringify(msg.value),
        timestamp: Date.now().toString()
      }));

      const result = await this.producer.send({
        topic,
        messages: formattedMessages
      });

      logger.info(`Batch of ${messages.length} messages sent to topic ${topic}`);
      return result;
    } catch (error) {
      logger.error(`Error sending batch to topic ${topic}:`, error);
      throw error;
    }
  }

  async sendWithRetry(topic, message, key = null, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendMessage(topic, message, key);
      } catch (error) {
        lastError = error;
        logger.warn(`Retry attempt ${attempt}/${maxRetries} for topic ${topic}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = KafkaProducer;
