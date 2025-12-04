const { v4: uuidv4 } = require('uuid');

class OrderEvent {
  constructor(data) {
    this.eventId = uuidv4();
    this.eventType = data.eventType || 'ORDER_CREATED';
    this.timestamp = new Date().toISOString();
    this.orderId = data.orderId || uuidv4();
    this.userId = data.userId;
    this.items = data.items || [];
    this.totalAmount = data.totalAmount;
    this.currency = data.currency || 'USD';
    this.status = data.status || 'PENDING';
    this.shippingAddress = data.shippingAddress;
    this.metadata = data.metadata || {};
  }

  validate() {
    if (!this.userId) {
      throw new Error('userId is required');
    }
    if (!this.items || this.items.length === 0) {
      throw new Error('items array cannot be empty');
    }
    if (!this.totalAmount || this.totalAmount <= 0) {
      throw new Error('totalAmount must be greater than 0');
    }
    return true;
  }

  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      orderId: this.orderId,
      userId: this.userId,
      items: this.items,
      totalAmount: this.totalAmount,
      currency: this.currency,
      status: this.status,
      shippingAddress: this.shippingAddress,
      metadata: this.metadata
    };
  }
}

module.exports = OrderEvent;
