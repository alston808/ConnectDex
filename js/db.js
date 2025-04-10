import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://fdbkuhuzinbddhjikezf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYmt1aHV6aW5iZGRoamlrZXpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI3MDIyMiwiZXhwIjoyMDU5ODQ2MjIyfQ.rMizpxjgQN95YDTMi3PaeY6fYJlA3DA3vAWXD1iD6dE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Check if user is admin
async function isAdminUser() {
  try {
    // If using Clerk
    if (window.Clerk && Clerk.user) {
      const user = Clerk.user;
      return user && user.primaryEmailAddress && 
             user.primaryEmailAddress.emailAddress.toLowerCase().includes("alston");
    }
    
    // Fallback to Supabase user
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    return data.user && 
           data.user.email && 
           data.user.email.toLowerCase().includes("alston");
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Auth functions
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
  try {
    // If using Clerk
    if (window.Clerk) {
      return { data: { user: Clerk.user } };
    }
    
    // Fallback to Supabase
    return await supabase.auth.getUser();
  } catch (error) {
    console.error("Error getting current user:", error);
    return { data: { user: null }, error };
  }
}

// Contact functions
export async function getContacts() {
  try {
    // First check if contacts table exists
    const { error: tableCheckError } = await supabase
      .from('contacts')
      .select('id')
      .limit(1);
    
    if (tableCheckError) {
      console.error('Table check error:', tableCheckError);
      throw new Error('Contacts table may not exist. Please check database setup.');
    }
    
    // Get contacts with media
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
      media: contact.media ? contact.media.map(m => m.url) : [],
      notes: contact.notes
    }));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}

export async function addContact(contactData) {
  try {
    // Verify admin permission
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error("Permission denied: Only admin can add or modify contacts.");
    }
    
    // Separate media from contact data
    const { media, ...contactInfo } = contactData;
    
    // Get current user
    const currentUser = await getCurrentUser();
    const userId = currentUser.data.user?.id;
    
    if (!userId) {
      throw new Error("User not authenticated. Please log in again.");
    }
    
    // Insert contact
    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        ...contactInfo,
        user_id: userId
      }])
      .select();
    
    if (error) throw error;
    
    // Add media if provided
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
  } catch (error) {
    console.error('Error adding contact:', error);
    throw error;
  }
}

export async function updateContact(id, contactData) {
  try {
    // Verify admin permission
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error("Permission denied: Only admin can add or modify contacts.");
    }
    
    // Separate media from contact data
    const { media, ...contactInfo } = contactData;
    
    // Update contact
    const { data, error } = await supabase
      .from('contacts')
      .update(contactInfo)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Update media if provided
    if (media !== undefined) {
      // First delete existing media
      const { error: deleteError } = await supabase
        .from('media')
        .delete()
        .eq('contact_id', id);
      
      if (deleteError) throw deleteError;
      
      // Then add new media
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
  } catch (error) {
    console.error('Error updating contact:', error);
    throw error;
  }
}

export async function deleteContact(id) {
  try {
    // Verify admin permission
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      throw new Error("Permission denied: Only admin can delete contacts.");
    }
    
    // First delete media
    const { error: mediaError } = await supabase
      .from('media')
      .delete()
      .eq('contact_id', id);
    
    if (mediaError) throw mediaError;
    
    // Then delete contact
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
}

export async function uploadMedia(file, folder = 'media') {
  try {
    // Verify file
    if (!file || !(file instanceof File)) {
      throw new Error("Invalid file provided");
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    
    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('contact-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data } = supabase.storage
      .from('contact-media')
      .getPublicUrl(filePath);
    
    if (!data || !data.publicUrl) {
      throw new Error("Failed to get public URL for uploaded file");
    }
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}