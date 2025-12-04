const { v4: uuidv4 } = require('uuid');

class UserEvent {
  constructor(data) {
    this.eventId = uuidv4();
    this.eventType = data.eventType || 'USER_CREATED';
    this.timestamp = new Date().toISOString();
    this.userId = data.userId || uuidv4();
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phoneNumber = data.phoneNumber;
    this.preferences = data.preferences || {};
    this.metadata = data.metadata || {};
  }

  validate() {
    if (!this.email) {
      throw new Error('email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('invalid email format');
    }
    return true;
  }

  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      timestamp: this.timestamp,
      userId: this.userId,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      preferences: this.preferences,
      metadata: this.metadata
    };
  }
}

module.exports = UserEvent;
