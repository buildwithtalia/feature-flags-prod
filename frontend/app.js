// Configuration
const API_BASE_URL = 'http://localhost:3002/api';

// State
let flags = [];
let editingFlagId = null;
let flagToDelete = null;

// DOM Elements
const flagForm = document.getElementById('flag-form');
const flagIdInput = document.getElementById('flag-id');
const flagNameInput = document.getElementById('flag-name');
const flagDescriptionInput = document.getElementById('flag-description');
const flagEnabledInput = document.getElementById('flag-enabled');
const flagRulesInput = document.getElementById('flag-rules');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const flagsContainer = document.getElementById('flags-container');
const loadingDiv = document.getElementById('loading');
const errorMessageDiv = document.getElementById('error-message');
const emptyStateDiv = document.getElementById('empty-state');
const alertDiv = document.getElementById('alert');
const totalFlagsSpan = document.getElementById('total-flags');
const enabledFlagsSpan = document.getElementById('enabled-flags');
const deleteModal = document.getElementById('delete-modal');
const deleteFlagNameSpan = document.getElementById('delete-flag-name');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadFlags();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  flagForm.addEventListener('submit', handleFormSubmit);
  cancelBtn.addEventListener('click', resetForm);
  confirmDeleteBtn.addEventListener('click', confirmDelete);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  
  // Close modal on background click
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

// API Functions
async function fetchFlags() {
  const response = await fetch(`${API_BASE_URL}/flags`);
  if (!response.ok) {
    throw new Error('Failed to fetch feature flags');
  }
  return await response.json();
}

async function createFlag(flagData) {
  const response = await fetch(`${API_BASE_URL}/flags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flagData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create feature flag');
  }
  
  return await response.json();
}

async function updateFlag(id, flagData) {
  const response = await fetch(`${API_BASE_URL}/flags/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flagData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update feature flag');
  }
  
  return await response.json();
}

async function deleteFlag(id) {
  const response = await fetch(`${API_BASE_URL}/flags/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete feature flag');
  }
  
  return await response.json();
}

// UI Functions
async function loadFlags() {
  try {
    showLoading();
    hideError();
    
    flags = await fetchFlags();
    
    hideLoading();
    renderFlags();
    updateStats();
  } catch (error) {
    hideLoading();
    showError(error.message);
    console.error('Error loading flags:', error);
  }
}

function renderFlags() {
  if (flags.length === 0) {
    flagsContainer.innerHTML = '';
    emptyStateDiv.classList.remove('hidden');
    return;
  }
  
  emptyStateDiv.classList.add('hidden');
  
  flagsContainer.innerHTML = flags.map(flag => `
    <div class="flag-item" data-id="${flag.id}">
      <div class="flag-header">
        <div class="flag-info">
          <div class="flag-name">
            ${escapeHtml(flag.name)}
            <span class="status-badge ${flag.enabled ? 'enabled' : 'disabled'}">
              ${flag.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          ${flag.description ? `<div class="flag-description">${escapeHtml(flag.description)}</div>` : ''}
          <div class="flag-meta">
            <span>🕐 Created: ${formatDate(flag.createdAt)}</span>
            <span>🔄 Updated: ${formatDate(flag.updatedAt)}</span>
          </div>
          ${flag.rules && flag.rules.length > 0 ? `
            <div class="flag-rules">
              <strong>Rules:</strong>
              <pre>${JSON.stringify(flag.rules, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
        <div class="flag-actions">
          <label class="toggle-switch" title="Toggle enabled/disabled">
            <input 
              type="checkbox" 
              ${flag.enabled ? 'checked' : ''} 
              onchange="toggleFlag('${flag.id}', this.checked)"
            >
            <span class="toggle-slider"></span>
          </label>
          <button class="btn btn-primary btn-small" onclick="editFlag('${flag.id}')">
            Edit
          </button>
          <button class="btn btn-danger btn-small" onclick="showDeleteModal('${flag.id}')">
            Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  totalFlagsSpan.textContent = flags.length;
  enabledFlagsSpan.textContent = flags.filter(f => f.enabled).length;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const name = flagNameInput.value.trim();
  const description = flagDescriptionInput.value.trim();
  const enabled = flagEnabledInput.checked;
  let rules = [];
  
  // Validate and parse rules
  const rulesText = flagRulesInput.value.trim();
  if (rulesText) {
    try {
      rules = JSON.parse(rulesText);
      if (!Array.isArray(rules)) {
        showAlert('Rules must be a valid JSON array', 'error');
        return;
      }
    } catch (error) {
      showAlert('Invalid JSON format for rules', 'error');
      return;
    }
  }
  
  const flagData = {
    name,
    description,
    enabled,
    rules,
  };
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = editingFlagId ? 'Updating...' : 'Creating...';
    
    if (editingFlagId) {
      await updateFlag(editingFlagId, flagData);
      showAlert('Feature flag updated successfully!', 'success');
    } else {
      await createFlag(flagData);
      showAlert('Feature flag created successfully!', 'success');
    }
    
    resetForm();
    await loadFlags();
  } catch (error) {
    showAlert(error.message, 'error');
    console.error('Error saving flag:', error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingFlagId ? 'Update Flag' : 'Create Flag';
  }
}

function editFlag(id) {
  const flag = flags.find(f => f.id === id);
  if (!flag) return;
  
  editingFlagId = id;
  flagIdInput.value = id;
  flagNameInput.value = flag.name;
  flagDescriptionInput.value = flag.description || '';
  flagEnabledInput.checked = flag.enabled;
  flagRulesInput.value = flag.rules && flag.rules.length > 0 
    ? JSON.stringify(flag.rules, null, 2) 
    : '';
  
  formTitle.textContent = 'Edit Feature Flag';
  submitBtn.textContent = 'Update Flag';
  cancelBtn.style.display = 'inline-block';
  
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingFlagId = null;
  flagForm.reset();
  flagIdInput.value = '';
  formTitle.textContent = 'Create New Feature Flag';
  submitBtn.textContent = 'Create Flag';
  cancelBtn.style.display = 'none';
}

async function toggleFlag(id, enabled) {
  const flag = flags.find(f => f.id === id);
  if (!flag) return;
  
  try {
    await updateFlag(id, { ...flag, enabled });
    showAlert(`Feature flag ${enabled ? 'enabled' : 'disabled'} successfully!`, 'success');
    await loadFlags();
  } catch (error) {
    showAlert(error.message, 'error');
    console.error('Error toggling flag:', error);
    // Reload to reset the toggle
    await loadFlags();
  }
}

function showDeleteModal(id) {
  const flag = flags.find(f => f.id === id);
  if (!flag) return;
  
  flagToDelete = id;
  deleteFlagNameSpan.textContent = flag.name;
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  flagToDelete = null;
  deleteModal.classList.add('hidden');
}

async function confirmDelete() {
  if (!flagToDelete) return;
  
  try {
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';
    
    await deleteFlag(flagToDelete);
    showAlert('Feature flag deleted successfully!', 'success');
    closeDeleteModal();
    await loadFlags();
  } catch (error) {
    showAlert(error.message, 'error');
    console.error('Error deleting flag:', error);
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete';
  }
}

function showAlert(message, type = 'success') {
  alertDiv.textContent = message;
  alertDiv.className = `alert ${type}`;
  alertDiv.classList.remove('hidden');
  
  setTimeout(() => {
    alertDiv.classList.add('hidden');
  }, 5000);
}

function showLoading() {
  loadingDiv.classList.remove('hidden');
  flagsContainer.classList.add('hidden');
}

function hideLoading() {
  loadingDiv.classList.add('hidden');
  flagsContainer.classList.remove('hidden');
}

function showError(message) {
  errorMessageDiv.textContent = message;
  errorMessageDiv.classList.remove('hidden');
}

function hideError() {
  errorMessageDiv.classList.add('hidden');
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Make functions globally accessible for inline event handlers
window.editFlag = editFlag;
window.toggleFlag = toggleFlag;
window.showDeleteModal = showDeleteModal;
