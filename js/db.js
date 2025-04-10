import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://fdbkuhuzinbddhjikezf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYmt1aHV6aW5iZGRoamlrZXpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI3MDIyMiwiZXhwIjoyMDU5ODQ2MjIyfQ.rMizpxjgQN95YDTMi3PaeY6fYJlA3DA3vAWXD1iD6dE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function isAdminUser() {
  const currentUser = await getCurrentUser();
  const user = currentUser.data.user;
  return user && user.email && user.email.toLowerCase().includes("alston");
}

export async function signUp(email, password) {
  return await supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  return await supabase.auth.getUser();
}

export async function getContacts() {
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      media(*)
    `)
    .order('name');
  
  if (error) throw error;
  
  return data.map(contact => ({
    id: contact.id,
    name: contact.name,
    age: contact.age,
    role: contact.role,
    photo: contact.photo,
    phone: contact.phone,
    address: contact.address,
    apt: contact.apt,
    callbox: contact.callbox,
    height: contact.height,
    weight: contact.weight,
    grindr: contact.grindr,
    twitter: contact.twitter,
    telegram: contact.telegram,
    preferences: contact.preferences || [],
    kinks: contact.kinks || [],
    media: contact.media.map(m => m.url) || [],
    notes: contact.notes
  }));
}

export async function addContact(contactData) {
  if (!(await isAdminUser())) {
    throw new Error("Permission denied: Only admin can add or modify contacts.");
  }
  const { media, ...contactInfo } = contactData;
  const currentUser = await getCurrentUser();
  const { data, error } = await supabase
    .from('contacts')
    .insert([{
      ...contactInfo,
      user_id: currentUser.data.user.id
    }])
    .select();
  
  if (error) throw error;
  
  if (media && media.length > 0) {
    const mediaItems = media.map(url => ({
      contact_id: data[0].id,
      url,
      media_type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
    }));
    
    const { error: mediaError } = await supabase
      .from('media')
      .insert(mediaItems);
    
    if (mediaError) throw mediaError;
  }
  
  return data[0];
}

export async function updateContact(id, contactData) {
  if (!(await isAdminUser())) {
    throw new Error("Permission denied: Only admin can add or modify contacts.");
  }
  const { media, ...contactInfo } = contactData;
  const { data, error } = await supabase
    .from('contacts')
    .update(contactInfo)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  
  if (media) {
    const { error: deleteError } = await supabase
      .from('media')
      .delete()
      .eq('contact_id', id);
    
    if (deleteError) throw deleteError;
    
    if (media.length > 0) {
      const mediaItems = media.map(url => ({
        contact_id: id,
        url,
        media_type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
      }));
      
      const { error: mediaError } = await supabase
        .from('media')
        .insert(mediaItems);
      
      if (mediaError) throw mediaError;
    }
  }
  
  return data[0];
}

export async function deleteContact(id) {
  if (!(await isAdminUser())) {
    throw new Error("Permission denied: Only admin can add or modify contacts.");
  }
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  
  return true;
}

export async function uploadMedia(file, folder = 'media') {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;
  
  const { error } = await supabase.storage
    .from('contact-media')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data } = supabase.storage
    .from('contact-media')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}