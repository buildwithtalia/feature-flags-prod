# Event Examples

This document provides example events for testing the Kafka event-driven application.

## Order Events

### Order Created
```json
{
  "eventType": "ORDER_CREATED",
  "userId": "user-12345",
  "items": [
    {
      "productId": "prod-001",
      "productName": "Wireless Headphones",
      "quantity": 1,
      "price": 79.99
    },
    {
      "productId": "prod-002",
      "productName": "USB-C Cable",
      "quantity": 2,
      "price": 12.99
    }
  ],
  "totalAmount": 105.97,
  "currency": "USD",
  "status": "PENDING",
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "country": "USA"
  },
  "metadata": {
    "source": "web",
    "campaign": "summer-sale"
  }
}
```

### Order Updated
```json
{
  "eventType": "ORDER_UPDATED",
  "orderId": "order-67890",
  "userId": "user-12345",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 1,
      "price": 79.99
    }
  ],
  "totalAmount": 79.99,
  "currency": "USD",
  "status": "PROCESSING",
  "shippingAddress": {
    "street": "456 Oak Avenue",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90001",
    "country": "USA"
  }
}
```

### Order Cancelled
```json
{
  "eventType": "ORDER_CANCELLED",
  "orderId": "order-67890",
  "userId": "user-12345",
  "items": [],
  "totalAmount": 79.99,
  "currency": "USD",
  "status": "CANCELLED",
  "metadata": {
    "reason": "customer_request",
    "cancelledBy": "user-12345"
  }
}
```

## User Events

### User Created
```json
{
  "eventType": "USER_CREATED",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1-555-123-4567",
  "preferences": {
    "newsletter": true,
    "notifications": {
      "email": true,
      "sms": false,
      "push": true
    },
    "language": "en",
    "timezone": "America/Los_Angeles"
  },
  "metadata": {
    "signupSource": "mobile_app",
    "referralCode": "FRIEND2024"
  }
}
```

### User Updated
```json
{
  "eventType": "USER_UPDATED",
  "userId": "user-12345",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1-555-987-6543",
  "preferences": {
    "newsletter": false,
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  }
}
```

### User Deleted
```json
{
  "eventType": "USER_DELETED",
  "userId": "user-12345",
  "email": "john.doe@example.com",
  "metadata": {
    "deletionReason": "user_request",
    "deletedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Notification Events

### Email Notification
```json
{
  "type": "EMAIL",
  "recipient": "user-12345",
  "recipientEmail": "john.doe@example.com",
  "subject": "Your Order Has Been Shipped",
  "message": "Your order #12345 has been shipped and will arrive in 3-5 business days.",
  "template": "order_shipped",
  "data": {
    "orderId": "order-12345",
    "trackingNumber": "1Z999AA10123456784",
    "estimatedDelivery": "2024-01-20"
  },
  "priority": "normal",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### SMS Notification
```json
{
  "type": "SMS",
  "recipient": "user-12345",
  "phoneNumber": "+1-555-123-4567",
  "message": "Your verification code is: 123456",
  "priority": "high",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Push Notification
```json
{
  "type": "PUSH",
  "recipient": "user-12345",
  "title": "New Message",
  "message": "You have a new message from Support",
  "data": {
    "messageId": "msg-789",
    "conversationId": "conv-456"
  },
  "priority": "normal",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

## Payment Events

### Payment Initiated
```json
{
  "eventType": "PAYMENT_INITIATED",
  "paymentId": "pay-12345",
  "orderId": "order-67890",
  "userId": "user-12345",
  "amount": 105.97,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "status": "PENDING",
  "metadata": {
    "cardLast4": "4242",
    "cardBrand": "visa"
  }
}
```

### Payment Completed
```json
{
  "eventType": "PAYMENT_COMPLETED",
  "paymentId": "pay-12345",
  "orderId": "order-67890",
  "userId": "user-12345",
  "amount": 105.97,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "status": "COMPLETED",
  "transactionId": "txn-abc123",
  "timestamp": "2024-01-15T14:35:00Z"
}
```

### Payment Failed
```json
{
  "eventType": "PAYMENT_FAILED",
  "paymentId": "pay-12345",
  "orderId": "order-67890",
  "userId": "user-12345",
  "amount": 105.97,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "status": "FAILED",
  "errorCode": "insufficient_funds",
  "errorMessage": "The card has insufficient funds",
  "timestamp": "2024-01-15T14:35:00Z"
}
```

## Using These Examples

### In Code
```javascript
const EventProducer = require('./producer');

const producer = new EventProducer();
await producer.initialize();

// Publish an order event
await producer.publishOrderEvent({
  userId: "user-12345",
  items: [
    { productId: "prod-001", quantity: 1, price: 79.99 }
  ],
  totalAmount: 79.99,
  shippingAddress: {
    street: "123 Main St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102"
  }
});
```

### Via Test Producer
The `testProducer.js` script automatically generates sample events. Run it with:
```bash
npm run test:producer
```

### Custom Events
Modify the examples above to match your use case and publish them using the producer service.
