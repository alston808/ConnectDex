import { getContacts, addContact, updateContact, deleteContact, uploadMedia, getCurrentUser } from './db.js';

let contacts = [];
let isAdmin = false;

const contactsContainer = document.getElementById('contacts-container');
const contactModal = document.getElementById('contact-modal');
const editModal = document.getElementById('edit-modal');
const contactForm = document.getElementById('contact-form');
const contactCount = document.getElementById('contact-count');
const searchInput = document.getElementById('search-input');
const addButton = document.getElementById('add-button');

document.addEventListener('DOMContentLoaded', async function() {
  await Clerk.load();
  window.currentUser = Clerk.user;
  isAdmin = window.currentUser && window.currentUser.email && window.currentUser.email.toLowerCase().includes("alston");
  console.log("Admin status:", isAdmin);
  if (!isAdmin) {
    addButton.style.display = 'none';
  }
  
  loadContacts();
  
  searchInput.addEventListener('input', handleSearch);
  contactForm.addEventListener('submit', handleFormSubmit);
  addButton.addEventListener('click', () => {
    console.log("FAB button clicked");
    handleAddClick();
  });
  document.getElementById('modal-close').addEventListener('click', () => {
    contactModal.style.display = 'none';
  });
  document.getElementById('edit-modal-close').addEventListener('click', () => {
    editModal.style.display = 'none';
  });
  document.getElementById('delete-button').addEventListener('click', handleDelete);
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
});

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
      (contact.notes && contact.notes.toLowerCase().includes(searchTerm))
    );
  });
  renderContacts(filtered);
}

function renderContacts(contactsList = contacts) {
  contactsContainer.innerHTML = '';
  contactCount.textContent = `${contactsList.length} Contacts`;
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
  const contactId = document.getElementById('edit-id').value;
  const contactData = {
    name: document.getElementById('edit-name').value,
    age: parseInt(document.getElementById('edit-age').value),
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
  
  try {
    if (contactId) {
      await updateContact(contactId, contactData);
    } else {
      await addContact(contactData);
    }
    await loadContacts();
    editModal.style.display = 'none';
  } catch (error) {
    console.error('Error saving contact:', error);
    alert('Error saving contact. Please try again.');
  }
}

async function handleDelete() {
  if (!isAdmin) {
    alert("Permission denied: You do not have privileges to delete contacts.");
    return;
  }
  if (!confirm('Are you sure you want to delete this contact?')) return;
  const contactId = document.getElementById('edit-id').value;
  try {
    await deleteContact(contactId);
    await loadContacts();
    editModal.style.display = 'none';
  } catch (error) {
    console.error('Error deleting contact:', error);
    alert('Error deleting contact. Please try again.');
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
  document.getElementById('modal-name').textContent = contact.name;
  document.getElementById('modal-age').textContent = contact.age || '';
  document.getElementById('modal-role').textContent = contact.role || '';
  document.getElementById('modal-photo').src = contact.photo || '/api/placeholder/200/200';
  document.getElementById('modal-phone').textContent = `Phone: ${contact.phone || ''}`;
  document.getElementById('modal-address').textContent = `Address: ${contact.address || ''}`;
  document.getElementById('modal-apt').textContent = `Apt: ${contact.apt || ''}`;
  document.getElementById('modal-callbox').textContent = `Callbox: ${contact.callbox || ''}`;
  document.getElementById('modal-stats').textContent = `Height: ${contact.height || ''} • Weight: ${contact.weight || ''}`;
  
  contactModal.style.display = 'flex';
  
  const editButton = document.createElement('button');
  editButton.className = 'button';
  editButton.textContent = 'Edit';
  editButton.style.position = 'absolute';
  editButton.style.top = '30px';
  editButton.style.right = '70px';
  
  editButton.addEventListener('click', () => {
    if (!isAdmin) {
      alert("Permission denied: You do not have privileges to edit contacts.");
      return;
    }
    openEditModal(contact);
    contactModal.style.display = 'none';
  });
  
  const oldEditButton = document.querySelector('#contact-modal .button');
  if (oldEditButton) oldEditButton.remove();
  
  document.querySelector('.modal-header').appendChild(editButton);
}

function openEditModal(contact = null) {
  if (contact) {
    document.getElementById('edit-modal-title').textContent = 'Edit Contact';
    document.getElementById('delete-button').style.display = isAdmin ? 'inline-block' : 'none';
    document.getElementById('edit-id').value = contact.id;
    document.getElementById('edit-name').value = contact.name;
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
  
  editModal.style.display = 'flex';
}