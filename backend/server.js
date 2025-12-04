const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;
const DATA_FILE = path.join(__dirname, 'data', 'flags.json');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const initialData = [
    {
      id: uuidv4(),
      name: "dark-mode",
      description: "Enable dark mode theme",
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rules: []
    },
    {
      id: uuidv4(),
      name: "new-dashboard",
      description: "Show new dashboard UI",
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rules: [{ type: "user_percentage", value: 25 }]
    }
  ];
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// Helper functions
const readFlags = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading flags:', error);
    return [];
  }
};

const writeFlags = (flags) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(flags, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing flags:', error);
    return false;
  }
};

const validateFlag = (flag) => {
  const errors = [];
  
  if (!flag.name || typeof flag.name !== 'string' || flag.name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (flag.description !== undefined && typeof flag.description !== 'string') {
    errors.push('Description must be a string');
  }
  
  if (flag.enabled !== undefined && typeof flag.enabled !== 'boolean') {
    errors.push('Enabled must be a boolean');
  }
  
  if (flag.rules !== undefined && !Array.isArray(flag.rules)) {
    errors.push('Rules must be an array');
  }
  
  return errors;
};

// Routes

// GET /api/flags - List all feature flags
app.get('/api/flags', (req, res) => {
  try {
    const flags = readFlags();
    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// GET /api/flags/:id - Get a specific flag
app.get('/api/flags/:id', (req, res) => {
  try {
    const flags = readFlags();
    const flag = flags.find(f => f.id === req.params.id);
    
    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }
    
    res.json(flag);
  } catch (error) {
    console.error('Error fetching flag:', error);
    res.status(500).json({ error: 'Failed to fetch feature flag' });
  }
});

// POST /api/flags - Create a new flag
app.post('/api/flags', (req, res) => {
  try {
    const validationErrors = validateFlag(req.body);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    
    const flags = readFlags();
    
    // Check for duplicate name
    if (flags.some(f => f.name === req.body.name)) {
      return res.status(409).json({ error: 'A feature flag with this name already exists' });
    }
    
    const newFlag = {
      id: uuidv4(),
      name: req.body.name.trim(),
      description: req.body.description || '',
      enabled: req.body.enabled !== undefined ? req.body.enabled : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rules: req.body.rules || []
    };
    
    flags.push(newFlag);
    
    if (!writeFlags(flags)) {
      return res.status(500).json({ error: 'Failed to save feature flag' });
    }
    
    res.status(201).json(newFlag);
  } catch (error) {
    console.error('Error creating flag:', error);
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
});

// PUT /api/flags/:id - Update a flag
app.put('/api/flags/:id', (req, res) => {
  try {
    const validationErrors = validateFlag(req.body);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    
    const flags = readFlags();
    const flagIndex = flags.findIndex(f => f.id === req.params.id);
    
    if (flagIndex === -1) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }
    
    // Check for duplicate name (excluding current flag)
    if (flags.some(f => f.name === req.body.name && f.id !== req.params.id)) {
      return res.status(409).json({ error: 'A feature flag with this name already exists' });
    }
    
    const updatedFlag = {
      ...flags[flagIndex],
      name: req.body.name.trim(),
      description: req.body.description !== undefined ? req.body.description : flags[flagIndex].description,
      enabled: req.body.enabled !== undefined ? req.body.enabled : flags[flagIndex].enabled,
      rules: req.body.rules !== undefined ? req.body.rules : flags[flagIndex].rules,
      updatedAt: new Date().toISOString()
    };
    
    flags[flagIndex] = updatedFlag;
    
    if (!writeFlags(flags)) {
      return res.status(500).json({ error: 'Failed to update feature flag' });
    }
    
    res.json(updatedFlag);
  } catch (error) {
    console.error('Error updating flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// DELETE /api/flags/:id - Delete a flag
app.delete('/api/flags/:id', (req, res) => {
  try {
    const flags = readFlags();
    const flagIndex = flags.findIndex(f => f.id === req.params.id);
    
    if (flagIndex === -1) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }
    
    const deletedFlag = flags[flagIndex];
    flags.splice(flagIndex, 1);
    
    if (!writeFlags(flags)) {
      return res.status(500).json({ error: 'Failed to delete feature flag' });
    }
    
    res.json({ message: 'Feature flag deleted successfully', flag: deletedFlag });
  } catch (error) {
    console.error('Error deleting flag:', error);
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Feature Flags API server running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
