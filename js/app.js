import { getContacts, addContact, updateContact, deleteContact, uploadMedia, getCurrentUser } from './db.js';

let contacts = [];
let isAdmin = false;

const contactsContainer = document.getElementById('contacts-container');
const contactModal = document.getElementById('contact-modal');
const editModal = document.getElementById('edit-modal');
const contactForm = document.getElementById('contact-form');
const searchInput = document.getElementById('search-input');
const addButton = document.getElementById('add-button');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Wait for Clerk to load
    await Clerk.load();
    
    // Get current user and set admin status
    const user = Clerk.user;
    window.currentUser = user;
    isAdmin = window.currentUser && window.currentUser.primaryEmailAddress && 
              window.currentUser.primaryEmailAddress.emailAddress.toLowerCase().includes("alston");
    console.log("Admin status:", isAdmin);
    
    // Hide add button if not admin
    if (!isAdmin) {
      addButton.style.display = 'none';
    }
    
    // Load contacts
    await loadContacts();
    
    // Set up event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error("Initialization error:", error);
    alert("There was an error loading the application. Please refresh the page and try again.");
  }
});

function setupEventListeners() {
  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Contact form
  if (contactForm) {
    contactForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Add button
  if (addButton) {
    addButton.addEventListener('click', () => {
      console.log("FAB button clicked");
      handleAddClick();
    });
  }
  
  // Modal close buttons
  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      contactModal.style.display = 'none';
    });
  }
  
  const editModalClose = document.getElementById('edit-modal-close');
  if (editModalClose) {
    editModalClose.addEventListener('click', () => {
      editModal.style.display = 'none';
    });
  }
  
  // Delete button
  const deleteButton = document.getElementById('delete-button');
  if (deleteButton) {
    deleteButton.addEventListener('click', handleDelete);
  }
  
  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

async function loadContacts() {
  try {
    contacts = await getContacts();
    renderContacts();
  } catch (error) {
    console.error('Error loading contacts:', error);
    alert('Error loading contacts. Please try again.');
  }
}

function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  if (!searchTerm) {
    renderContacts();
    return;
  }
  const filtered = contacts.filter(contact => {
    return (
      contact.name.toLowerCase().includes(searchTerm) ||
      (contact.preferences && contact.preferences.some(pref => pref.toLowerCase().includes(searchTerm))) ||
      (contact.kinks && contact.kinks.some(kink => kink.toLowerCase().includes(searchTerm))) ||
      (contact.notes && contact.notes && contact.notes.toLowerCase().includes(searchTerm))
    );
  });
  renderContacts(filtered);
}

function renderContacts(contactsList = contacts) {
  contactsContainer.innerHTML = '';
  
  if (contactsList.length === 0) {
    contactsContainer.innerHTML = '<div class="glass" style="padding: 20px; text-align: center;">No contacts found</div>';
    return;
  }
  
  contactsList.forEach(contact => {
    const cardEl = document.createElement('div');
    cardEl.className = 'contact-card glass';
    cardEl.innerHTML = `
      <img src="${contact.photo || '/api/placeholder/400/320'}" alt="${contact.name}" class="contact-photo">
      <div class="contact-name">${contact.name}</div>
      <div class="contact-meta">
        <span>${contact.age || ''}</span>
        <span>${contact.role || ''}</span>
      </div>
      <div class="contact-preference">
        ${(contact.preferences || []).slice(0, 3).map(pref => `<span class="tag">${pref}</span>`).join('')}
      </div>
    `;
    
    // Make sure card is clickable
    cardEl.style.cursor = 'pointer';
    cardEl.addEventListener('click', () => {
      openContactModal(contact);
    });
    
    contactsContainer.appendChild(cardEl);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!isAdmin) {
    alert("Permission denied: You do not have privileges to modify contacts.");
    return;
  }
  
  // Get form data
  const contactId = document.getElementById('edit-id').value;
  const contactData = {
    name: document.getElementById('edit-name').value,
    age: parseInt(document.getElementById('edit-age').value) || null,
    role: document.getElementById('edit-role').value,
    photo: document.getElementById('edit-photo').value,
    phone: document.getElementById('edit-phone').value,
    address: document.getElementById('edit-address').value,
    apt: document.getElementById('edit-apt').value,
    callbox: document.getElementById('edit-callbox').value,
    height: document.getElementById('edit-height').value,
    weight: document.getElementById('edit-weight').value,
    grindr: document.getElementById('edit-grindr').value,
    twitter: document.getElementById('edit-twitter').value,
    telegram: document.getElementById('edit-telegram').value,
    preferences: document.getElementById('edit-preferences').value.split(',').map(p => p.trim()).filter(p => p),
    kinks: document.getElementById('edit-kinks').value.split(',').map(k => k.trim()).filter(k => k),
    media: document.getElementById('edit-media').value.split(',').map(m => m.trim()).filter(m => m),
    notes: document.getElementById('edit-notes').value
  };
  
  console.log("Saving contact data:", contactData);
  
  try {
    if (contactId) {
      await updateContact(contactId, contactData);
      console.log("Contact updated successfully");
    } else {
      await addContact(contactData);
      console.log("Contact added successfully");
    }
    
    await loadContacts();
    editModal.style.display = 'none';
  } catch (error) {
    console.error('Error saving contact:', error);
    alert('Error saving contact: ' + error.message);
  }
}

async function handleDelete() {
  if (!isAdmin) {
    alert("Permission denied: You do not have privileges to delete contacts.");
    return;
  }
  
  if (!confirm('Are you sure you want to delete this contact?')) return;
  
  const contactId = document.getElementById('edit-id').value;
  if (!contactId) {
    alert('No contact selected for deletion');
    return;
  }
  
  try {
    await deleteContact(contactId);
    console.log("Contact deleted successfully");
    await loadContacts();
    editModal.style.display = 'none';
  } catch (error) {
    console.error('Error deleting contact:', error);
    alert('Error deleting contact: ' + error.message);
  }
}

function handleAddClick() {
  if (!isAdmin) {
    alert("Permission denied: You do not have privileges to add contacts.");
    return;
  }
  
  console.log("handleAddClick triggered");
  document.getElementById('edit-modal-title').textContent = 'Add New Contact';
  document.getElementById('delete-button').style.display = 'none';
  contactForm.reset();
  document.getElementById('edit-id').value = '';
  editModal.style.display = 'flex';
}

function openContactModal(contact) {
  // Set basic contact information
  document.getElementById('modal-name').textContent = contact.name;
  document.getElementById('modal-age').textContent = contact.age || '';
  document.getElementById('modal-role').textContent = contact.role || '';
  document.getElementById('modal-photo').src = contact.photo || '/api/placeholder/200/200';
  document.getElementById('modal-phone').textContent = `Phone: ${contact.phone || ''}`;
  document.getElementById('modal-address').textContent = `Address: ${contact.address || ''}`;
  document.getElementById('modal-apt').textContent = `Apt: ${contact.apt || ''}`;
  document.getElementById('modal-callbox').textContent = `Callbox: ${contact.callbox || ''}`;
  document.getElementById('modal-stats').textContent = `Height: ${contact.height || ''} • Weight: ${contact.weight || ''}`;
  
  // Set preferences
  const preferencesContainer = document.getElementById('modal-preferences');
  if (preferencesContainer) {
    preferencesContainer.innerHTML = (contact.preferences || [])
      .map(pref => `<span class="tag">${pref}</span>`)
      .join('');
  }
  
  // Set kinks
  const kinksContainer = document.getElementById('modal-kinks');
  if (kinksContainer) {
    kinksContainer.innerHTML = (contact.kinks || [])
      .map(kink => `<span class="tag">${kink}</span>`)
      .join('');
  }
  
  // Set notes
  const notesContainer = document.getElementById('modal-notes');
  if (notesContainer) {
    notesContainer.innerHTML = contact.notes || '';
  }
  
  // Set media
  const mediaContainer = document.getElementById('modal-media');
  if (mediaContainer) {
    mediaContainer.innerHTML = '';
    
    if (contact.media && contact.media.length > 0) {
      contact.media.forEach(url => {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        
        if (url.match(/\.(mp4|mov)$/i)) {
          mediaItem.innerHTML = `<video controls><source src="${url}" type="video/${url.split('.').pop()}"></video>`;
        } else {
          mediaItem.innerHTML = `<img src="${url}" alt="Media">`;
        }
        
        mediaContainer.appendChild(mediaItem);
      });
    } else {
      mediaContainer.innerHTML = '<p>No media available</p>';
    }
  }
  
  // Set social links
  const socialContainer = document.getElementById('modal-social');
  if (socialContainer) {
    socialContainer.innerHTML = '';
    
    if (contact.grindr) {
      socialContainer.innerHTML += `<div class="social-icon" title="Grindr: ${contact.grindr}">G</div>`;
    }
    
    if (contact.twitter) {
      socialContainer.innerHTML += `<div class="social-icon" title="Twitter: ${contact.twitter}">X</div>`;
    }
    
    if (contact.telegram) {
      socialContainer.innerHTML += `<div class="social-icon" title="Telegram: ${contact.telegram}">T</div>`;
    }
  }
  
  // Add edit button if admin
  const modalHeader = document.querySelector('.modal-header');
  const existingEditButton = document.querySelector('#contact-modal .button');
  if (existingEditButton) {
    existingEditButton.remove();
  }
  
  if (isAdmin) {
    const editButton = document.createElement('button');
    editButton.className = 'button';
    editButton.textContent = 'Edit';
    editButton.style.position = 'absolute';
    editButton.style.top = '30px';
    editButton.style.right = '70px';
    
    editButton.addEventListener('click', () => {
      openEditModal(contact);
      contactModal.style.display = 'none';
    });
    
    modalHeader.appendChild(editButton);
  }
  
  // Show the modal
  contactModal.style.display = 'flex';
}

function openEditModal(contact = null) {
  if (!isAdmin) {
    alert("Permission denied: You do not have privileges to edit contacts.");
    return;
  }
  
  if (contact) {
    document.getElementById('edit-modal-title').textContent = 'Edit Contact';
    document.getElementById('delete-button').style.display = 'inline-block';
    document.getElementById('edit-id').value = contact.id;
    document.getElementById('edit-name').value = contact.name || '';
    document.getElementById('edit-age').value = contact.age || '';
    document.getElementById('edit-role').value = contact.role || '';
    document.getElementById('edit-photo').value = contact.photo || '';
    document.getElementById('edit-phone').value = contact.phone || '';
    document.getElementById('edit-address').value = contact.address || '';
    document.getElementById('edit-apt').value = contact.apt || '';
    document.getElementById('edit-callbox').value = contact.callbox || '';
    document.getElementById('edit-height').value = contact.height || '';
    document.getElementById('edit-weight').value = contact.weight || '';
    document.getElementById('edit-grindr').value = contact.grindr || '';
    document.getElementById('edit-twitter').value = contact.twitter || '';
    document.getElementById('edit-telegram').value = contact.telegram || '';
    document.getElementById('edit-preferences').value = (contact.preferences || []).join(', ');
    document.getElementById('edit-kinks').value = (contact.kinks || []).join(', ');
    document.getElementById('edit-media').value = (contact.media || []).join(', ');
    document.getElementById('edit-notes').value = contact.notes || '';
  } else {
    document.getElementById('edit-modal-title').textContent = 'Add New Contact';
    document.getElementById('delete-button').style.display = 'none';
    contactForm.reset();
    document.getElementById('edit-id').value = '';
  }
  
  // Show the modal
  editModal.style.display = 'flex';
}