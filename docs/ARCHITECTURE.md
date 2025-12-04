# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Kafka Cluster                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Zookeeper   │  │    Kafka     │  │   Kafka UI   │          │
│  │   :2181      │  │   :9092      │  │    :8080     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│    orders    │      │    users     │     │notifications │
│    topic     │      │    topic     │     │    topic     │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        │                     │                     │
    ┌───┴───┐             ┌───┴───┐           ┌───┴───┐
    │       │             │       │           │       │
    ▼       ▼             ▼       ▼           ▼       ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Producer│ │Consumer│ │Producer│ │Consumer│ │Consumer│
│Service │ │Group 1 │ │Service │ │Group 2 │ │Group 3 │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

## Components

### 1. Kafka Infrastructure

#### Zookeeper
- Manages Kafka cluster metadata
- Handles leader election for partitions
- Stores configuration and state

#### Kafka Broker
- Stores and serves messages
- Manages topics and partitions
- Handles producer and consumer connections

#### Kafka UI
- Web-based monitoring interface
- View topics, messages, and consumer groups
- Inspect cluster health

### 2. Producer Service

```
┌─────────────────────────────────────────┐
│         Producer Service                 │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │      Event Producer                 │ │
│  │  - publishOrderEvent()              │ │
│  │  - publishUserEvent()               │ │
│  │  - publishNotification()            │ │
│  └────────────────────────────────────┘ │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐ │
│  │      Kafka Producer                 │ │
│  │  - sendMessage()                    │ │
│  │  - sendBatch()                      │ │
│  │  - sendWithRetry()                  │ │
│  └────────────────────────────────────┘ │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐ │
│  │      Event Schemas                  │ │
│  │  - OrderEvent                       │ │
│  │  - UserEvent                        │ │
│  │  - validate()                       │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Responsibilities:**
- Validate event data against schemas
- Serialize events to JSON
- Publish to appropriate Kafka topics
- Handle retry logic for failed publishes
- Support batch publishing for efficiency

### 3. Consumer Service

```
┌─────────────────────────────────────────┐
│         Consumer Service                 │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Specialized Consumers             │ │
│  │  - OrderConsumer                    │ │
│  │  - UserConsumer                     │ │
│  │  - MultiTopicConsumer               │ │
│  └────────────────────────────────────┘ │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐ │
│  │      Kafka Consumer                 │ │
│  │  - subscribe()                      │ │
│  │  - registerHandler()                │ │
│  │  - run()                            │ │
│  │  - handleError()                    │ │
│  └────────────────────────────────────┘ │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐ │
│  │   Business Logic Handlers           │ │
│  │  - processNewOrder()                │ │
│  │  - processNewUser()                 │ │
│  │  - sendNotification()               │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Responsibilities:**
- Subscribe to one or more topics
- Deserialize JSON messages
- Execute business logic for each event type
- Handle errors and implement retry logic
- Commit offsets after successful processing

## Data Flow

### Publishing Events

```
1. Application creates event data
   ↓
2. Event schema validates data
   ↓
3. Event serialized to JSON
   ↓
4. Producer sends to Kafka topic
   ↓
5. Kafka stores in partition
   ↓
6. Producer receives acknowledgment
```

### Consuming Events

```
1. Consumer subscribes to topic(s)
   ↓
2. Kafka assigns partitions to consumer
   ↓
3. Consumer polls for new messages
   ↓
4. Message deserialized from JSON
   ↓
5. Handler processes message
   ↓
6. Consumer commits offset
   ↓
7. Loop back to step 3
```

## Scalability Patterns

### Consumer Groups

Multiple consumers can work together in a consumer group:

```
Topic: orders (3 partitions)
┌─────────────┬─────────────┬─────────────┐
│ Partition 0 │ Partition 1 │ Partition 2 │
└─────────────┴─────────────┴─────────────┘
       │              │              │
       ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│Consumer 1 │  │Consumer 2 │  │Consumer 3 │
└───────────┘  └───────────┘  └───────────┘
       └──────────────┬──────────────┘
                      │
              Consumer Group: order-processors
```

**Benefits:**
- Parallel processing of messages
- Automatic load balancing
- Fault tolerance (if one consumer fails, others take over)

### Partitioning Strategy

Messages with the same key go to the same partition:

```
Order Events with orderId as key:
- orderId: "order-1" → Partition 0
- orderId: "order-2" → Partition 1
- orderId: "order-1" → Partition 0 (same partition!)
```

**Benefits:**
- Maintains order for related events
- Enables stateful processing
- Predictable routing

## Error Handling

### Producer Error Handling

```
┌─────────────────┐
│  Send Message   │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │Success?│
    └───┬────┘
        │
    ┌───┴───┐
    │       │
   Yes      No
    │       │
    │       ▼
    │  ┌─────────────┐
    │  │ Retry Logic │
    │  └──────┬──────┘
    │         │
    │    ┌────┴────┐
    │    │Retries  │
    │    │Exceeded?│
    │    └────┬────┘
    │         │
    │     ┌───┴───┐
    │     │       │
    │    Yes      No
    │     │       │
    │     ▼       ▼
    │  ┌─────┐ ┌──────┐
    │  │Error│ │Retry │
    │  └─────┘ └──────┘
    │            │
    └────────────┘
         │
         ▼
    ┌─────────┐
    │  Done   │
    └─────────┘
```

### Consumer Error Handling

```
┌──────────────────┐
│ Receive Message  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Process Message  │
└────────┬─────────┘
         │
         ▼
    ┌────────┐
    │Success?│
    └───┬────┘
        │
    ┌───┴───┐
    │       │
   Yes      No
    │       │
    ▼       ▼
┌────────┐ ┌──────────────┐
│Commit  │ │ Log Error    │
│Offset  │ │ (Optional:   │
└────────┘ │ Send to DLQ) │
           └──────────────┘
```

## Configuration Management

### Environment-Based Configuration

```
.env (Development)
├── KAFKA_BROKERS=localhost:9092
├── CONSUMER_GROUP_ID=dev-consumer-group
└── LOG_LEVEL=debug

.env.production (Production)
├── KAFKA_BROKERS=kafka-1:9092,kafka-2:9092,kafka-3:9092
├── CONSUMER_GROUP_ID=prod-consumer-group
└── LOG_LEVEL=info
```

### Centralized Configuration

All Kafka settings are managed in `config/kafka.config.js`:
- Connection settings
- Retry policies
- Timeout values
- Topic names

## Monitoring and Observability

### Logging

```
Winston Logger
├── Console (Development)
├── File: combined.log (All levels)
└── File: error.log (Errors only)
```

### Metrics to Monitor

1. **Producer Metrics**
   - Messages sent per second
   - Failed send attempts
   - Average latency

2. **Consumer Metrics**
   - Messages consumed per second
   - Processing time per message
   - Consumer lag (offset difference)

3. **Kafka Metrics**
   - Broker health
   - Partition count
   - Replication status

### Kafka UI Dashboard

Access at `http://localhost:8080` to monitor:
- Topic throughput
- Consumer group lag
- Partition distribution
- Message inspection

## Best Practices

### 1. Event Design
- Use clear, descriptive event types
- Include timestamp in every event
- Add correlation IDs for tracing
- Keep events immutable

### 2. Topic Design
- One topic per event type
- Use meaningful topic names
- Configure appropriate retention
- Set partition count based on throughput

### 3. Consumer Design
- Process messages idempotently
- Commit offsets after processing
- Handle errors gracefully
- Use consumer groups for scaling

### 4. Producer Design
- Validate before publishing
- Use message keys for ordering
- Implement retry logic
- Batch when possible

### 5. Operations
- Monitor consumer lag
- Set up alerts for failures
- Regular backup of configurations
- Test disaster recovery procedures

## Future Enhancements

Potential improvements to consider:

1. **Schema Registry**: Centralized schema management with Avro
2. **Dead Letter Queue**: Separate topic for failed messages
3. **Exactly-Once Semantics**: Transactional producers and consumers
4. **Stream Processing**: Add Kafka Streams for real-time analytics
5. **Multi-Datacenter**: Replication across regions
6. **Security**: SSL/TLS encryption and SASL authentication
