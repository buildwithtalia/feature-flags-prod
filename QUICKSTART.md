# Kafka Event-Driven Application - Quick Start Guide

## Prerequisites Check
- [ ] Docker installed and running
- [ ] Node.js v16+ installed
- [ ] Ports 9092, 2181, 8080 available

## Setup Steps

### 1. Start Kafka Infrastructure (2 minutes)
```bash
docker-compose up -d
```

Wait for services to be healthy:
```bash
docker-compose ps
```

### 2. Install Dependencies (1 minute)
```bash
npm install
```

### 3. Verify Kafka is Ready
Open Kafka UI: http://localhost:8080

### 4. Run the Application

**Option A: Quick Demo**
```bash
# Terminal 1: Start consumer
npm run consumer

# Terminal 2: Generate test events
npm run test:producer
```

**Option B: Interactive Mode**
```bash
# Terminal 1: Start consumer
npm run consumer

# Terminal 2: Run producer with custom events
npm run producer
```

**Option C: Specific Consumers**
```bash
# Terminal 1: Order consumer
npm run consumer:orders

# Terminal 2: User consumer
npm run consumer:users

# Terminal 3: Generate events
npm run test:producer
```

## Expected Output

### Producer Output:
```
info: Kafka Producer connected successfully
info: Order event published: <order-id>
info: User event published: <user-id>
```

### Consumer Output:
```
info: Kafka Consumer connected with group: event-consumer-group
info: Processing message from topic orders
info: Processing order event: <order-id>
info: Message processed successfully from topic orders
```

## Verification

1. **Check Kafka UI**: http://localhost:8080
   - View topics: orders, users, notifications
   - See message counts
   - Inspect consumer groups

2. **Check Logs**:
   ```bash
   tail -f logs/combined.log
   ```

## Troubleshooting

### Kafka not starting?
```bash
docker-compose down -v
docker-compose up -d
```

### Consumer not receiving messages?
- Check if producer ran successfully
- Verify topic exists in Kafka UI
- Ensure consumer is running

### Port conflicts?
Edit `docker-compose.yml` and change conflicting ports.

## Next Steps

1. Modify event schemas in `schemas/`
2. Add custom business logic in consumers
3. Create new topics in `.env`
4. Scale consumers by running multiple instances

## Stop Everything
```bash
# Stop consumers: Ctrl+C in each terminal
# Stop Kafka:
docker-compose down
```

---
For detailed documentation, see README.md
