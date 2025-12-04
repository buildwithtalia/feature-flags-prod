# Kafka Event-Driven Application

A complete event-driven application built with Apache Kafka and Node.js, demonstrating producer-consumer patterns, event schemas, error handling, and scalability through consumer groups.

## 🏗️ Architecture

This application consists of:

- **Kafka Infrastructure**: Zookeeper, Kafka broker, and Kafka UI (via Docker Compose)
- **Producer Service**: Publishes events to Kafka topics
- **Consumer Services**: Multiple consumers processing events from different topics
- **Event Schemas**: Structured event definitions for orders and users
- **Configuration**: Centralized configuration for Kafka and application settings

## 📋 Prerequisites

- Docker and Docker Compose installed
- Node.js (v16 or higher)
- npm or yarn

## 🚀 Quick Start

### 1. Start Kafka Infrastructure

```bash
# Start Zookeeper, Kafka, and Kafka UI
docker-compose up -d

# Verify services are running
docker-compose ps
```

The following services will be available:
- Kafka Broker: `localhost:9092`
- Kafka UI: `http://localhost:8080`
- Zookeeper: `localhost:2181`

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

The `.env` file is already configured with default values. Modify if needed:

```env
KAFKA_BROKERS=localhost:9092
CONSUMER_GROUP_ID=event-consumer-group
TOPIC_ORDERS=orders
TOPIC_USERS=users
TOPIC_NOTIFICATIONS=notifications
```

### 4. Run the Application

#### Option A: Run with HTTP API Servers (Recommended for Postman)

**Terminal 1 - Start Consumer API:**
```bash
npm run start:consumer-api
# Consumer API will run on http://localhost:3001
```

**Terminal 2 - Start Producer API:**
```bash
npm run start:producer-api
# Producer API will run on http://localhost:3000
```

**Terminal 3 - Use Postman or curl to interact:**
```bash
# Health check
curl http://localhost:3000/health
curl http://localhost:3001/health

# Publish an order event
curl -X POST http://localhost:3000/api/events/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "items": [{"productId": "prod-1", "quantity": 2, "price": 29.99}],
    "totalAmount": 59.98,
    "shippingAddress": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94102"
    }
  }'

# Get consumer statistics
curl http://localhost:3001/api/stats
```

#### Option B: Run Producer and Consumer Directly (CLI Mode)

**Terminal 1 - Start Consumer:**
```bash
# Multi-topic consumer (listens to all topics)
npm run consumer

# Or run specific consumers
npm run consumer:orders
npm run consumer:users
```

**Terminal 2 - Run Producer:**
```bash
# Run the producer with sample events
npm run producer

# Or run test producer to generate multiple events
npm run test:producer
```

#### Option C: Development Mode with Auto-Reload

```bash
# Terminal 1 - Consumer API with auto-reload
npm run dev:consumer-api

# Terminal 2 - Producer API with auto-reload
npm run dev:producer-api

# Or for CLI mode:
npm run dev:consumer
npm run dev:producer
```

## 🌐 HTTP API Endpoints

### Producer API (Port 3000)

#### Health Check
- **GET** `/health` - Check producer service health

#### Event Publishing
- **POST** `/api/events/orders` - Publish order events
  - Required fields: `userId`, `items`, `totalAmount`
  - Optional: `shippingAddress`, `eventType`

- **POST** `/api/events/users` - Publish user events
  - Required fields: `email`, `firstName`, `lastName`
  - Optional: `phoneNumber`, `preferences`, `eventType`

- **POST** `/api/events/notifications` - Publish notification events
  - Required fields: `type`, `recipient`
  - Optional: `message`, `metadata`

- **POST** `/api/events/payments` - Publish payment events
  - Required fields: `orderId`, `amount`, `paymentMethod`
  - Optional: `status`, `transactionId`

- **POST** `/api/events/batch` - Publish multiple events at once
  - Body: `{ "events": [{ "type": "order|user|notification|payment", "data": {...} }] }`

### Consumer API (Port 3001)

#### Health Check
- **GET** `/health` - Check consumer service health

#### Statistics & Monitoring
- **GET** `/api/stats` - Get consumer statistics
  - Returns: messages processed, errors, uptime, messages by topic

- **GET** `/api/consumer-groups` - Get consumer group information
  - Returns: group ID, subscribed topics, status

#### Consumer Control
- **POST** `/api/consumer/pause` - Pause message consumption
- **POST** `/api/consumer/resume` - Resume message consumption
- **POST** `/api/stats/reset` - Reset statistics counters

## 📁 Project Structure

```
.
├── docker-compose.yml          # Kafka infrastructure setup
├── package.json                # Dependencies and scripts
├── .env                        # Environment configuration
├── config/
│   ├── kafka.config.js        # Kafka configuration
│   └── logger.js              # Winston logger setup
├── schemas/
│   ├── orderSchema.js         # Order event schema
│   └── userSchema.js          # User event schema
├── producer/
│   ├── kafkaProducer.js       # Base Kafka producer class
│   ├── index.js               # Event producer with business logic
│   └── testProducer.js        # Test event generator
├── consumer/
│   ├── kafkaConsumer.js       # Base Kafka consumer class
│   ├── index.js               # Multi-topic consumer
│   ├── orderConsumer.js       # Order-specific consumer
│   └── userConsumer.js        # User-specific consumer
└── logs/                       # Application logs (auto-generated)
```

## 🎯 Features

### Event Publishing

The producer service supports:
- **Structured Events**: Type-safe event schemas with validation
- **Multiple Topics**: Orders, users, notifications, and payments
- **Batch Publishing**: Send multiple events in a single request
- **Retry Logic**: Automatic retry with exponential backoff
- **Message Keys**: Partition events by key for ordering guarantees

### Event Consumption

The consumer service provides:
- **Consumer Groups**: Multiple consumers for horizontal scaling
- **Topic Subscription**: Subscribe to single or multiple topics
- **Error Handling**: Graceful error handling with logging
- **Offset Management**: Automatic and manual offset commits
- **Pause/Resume**: Control consumer flow dynamically

### Event Schemas

#### Order Event
```javascript
{
  eventId: "uuid",
  eventType: "ORDER_CREATED | ORDER_UPDATED | ORDER_CANCELLED",
  timestamp: "ISO-8601",
  orderId: "uuid",
  userId: "string",
  items: [{ productId, quantity, price }],
  totalAmount: number,
  currency: "USD",
  status: "PENDING | PROCESSING | COMPLETED",
  shippingAddress: { street, city, state, zipCode }
}
```

#### User Event
```javascript
{
  eventId: "uuid",
  eventType: "USER_CREATED | USER_UPDATED | USER_DELETED",
  timestamp: "ISO-8601",
  userId: "uuid",
  email: "string",
  firstName: "string",
  lastName: "string",
  phoneNumber: "string",
  preferences: {}
}
```

## 🔧 Configuration

### Kafka Configuration

Edit `config/kafka.config.js` to customize:
- Broker addresses
- Connection timeouts
- Retry policies
- Consumer group settings

### Topics

Default topics are configured in `.env`:
- `orders` - Order-related events
- `users` - User-related events
- `notifications` - Notification events
- `payments` - Payment events

## 📊 Monitoring

### Kafka UI

Access the Kafka UI at `http://localhost:8080` to:
- View topics and partitions
- Monitor consumer groups
- Inspect messages
- Check broker health

### Logs

Application logs are stored in the `logs/` directory:
- `combined.log` - All log levels
- `error.log` - Error logs only

Console logs are enabled in development mode.

## 🧪 Testing

### Generate Test Events

```bash
npm run test:producer
```

This will generate:
- 5 order events
- 3 user events
- 3 notification events

### Verify Event Processing

1. Start a consumer: `npm run consumer`
2. Run the test producer: `npm run test:producer`
3. Check logs to verify events are processed
4. View events in Kafka UI at `http://localhost:8080`

## 🔄 Consumer Groups and Scalability

### Running Multiple Consumers

To demonstrate horizontal scaling, run multiple consumer instances:

```bash
# Terminal 1
npm run consumer:orders

# Terminal 2
npm run consumer:orders

# Terminal 3
npm run consumer:orders
```

Kafka will automatically distribute partitions among consumers in the same group.

### Consumer Group IDs

- `order-consumer-group` - Order processing consumers
- `user-consumer-group` - User processing consumers
- `multi-topic-consumer-group` - Multi-topic consumers

## 🛠️ Advanced Usage

### Custom Event Producer

```javascript
const EventProducer = require('./producer');

const producer = new EventProducer();
await producer.initialize();

await producer.publishOrderEvent({
  userId: 'user-123',
  items: [{ productId: 'prod-1', quantity: 2, price: 29.99 }],
  totalAmount: 59.98
});

await producer.shutdown();
```

### Custom Event Consumer

```javascript
const KafkaConsumer = require('./consumer/kafkaConsumer');

const consumer = new KafkaConsumer('my-consumer-group');
await consumer.connect();
await consumer.subscribe('my-topic');

consumer.registerHandler('my-topic', async (message) => {
  console.log('Received:', message.value);
});

await consumer.run();
```

## 🐛 Troubleshooting

### Kafka Connection Issues

```bash
# Check if Kafka is running
docker-compose ps

# View Kafka logs
docker-compose logs kafka

# Restart Kafka services
docker-compose restart
```

### Consumer Not Receiving Messages

1. Verify consumer is subscribed to the correct topic
2. Check consumer group ID is unique or shared appropriately
3. Ensure messages are being produced (check Kafka UI)
4. Verify offset position (may need to reset to beginning)

### Port Conflicts

If ports 9092, 2181, or 8080 are in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`

## 🧹 Cleanup

### Stop Services

```bash
# Stop Kafka infrastructure
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v
```

### Clean Logs

```bash
rm -rf logs/
```

## 📚 Additional Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Event-Driven Architecture Patterns](https://martinfowler.com/articles/201701-event-driven.html)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use this project for learning and development.

---

**Happy Event Streaming! 🚀**
