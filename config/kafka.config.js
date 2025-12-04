require('dotenv').config();

const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'kafka-event-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
    factor: 0.2
  }
};

const producerConfig = {
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
  retry: {
    retries: parseInt(process.env.PRODUCER_RETRY_ATTEMPTS) || 5,
    initialRetryTime: parseInt(process.env.PRODUCER_RETRY_DELAY) || 300
  }
};

const consumerConfig = {
  groupId: process.env.CONSUMER_GROUP_ID || 'event-consumer-group',
  sessionTimeout: parseInt(process.env.CONSUMER_SESSION_TIMEOUT) || 30000,
  heartbeatInterval: parseInt(process.env.CONSUMER_HEARTBEAT_INTERVAL) || 3000,
  allowAutoTopicCreation: true,
  retry: {
    retries: 5,
    initialRetryTime: 300
  }
};

const topics = {
  ORDERS: process.env.TOPIC_ORDERS || 'orders',
  USERS: process.env.TOPIC_USERS || 'users',
  NOTIFICATIONS: process.env.TOPIC_NOTIFICATIONS || 'notifications',
  PAYMENTS: process.env.TOPIC_PAYMENTS || 'payments'
};

module.exports = {
  kafkaConfig,
  producerConfig,
  consumerConfig,
  topics
};
