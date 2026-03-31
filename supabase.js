import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// REPLACE WITH YOUR ACTUAL VALUES
const SUPABASE_URL = 'https://obzeqgfqjupjusduwnhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemVxZ2ZxanVwanVzZHV3bmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTIzNDQsImV4cCI6MjA5MDUyODM0NH0.swq9CjovEZ-mGI7gWnWEIQsH3M70ciO2M6lo8Y2v2qg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Upload photo to Supabase Storage (UNIVERSAL - Works on Web AND Android)
export const uploadPhotoToStorage = async (localUri, recordId) => {
  try {
    console.log('📤 Starting upload for:', recordId, 'Platform:', Platform.OS);
    
    let fileBody;
    let fileExt = 'jpg';

    // Platform-specific handling
    if (Platform.OS === 'web') {
      // WEB: Uses standard Blob
      const response = await fetch(localUri);
      fileBody = await response.blob();
      fileExt = fileBody.type.split('/')[1] || 'jpg';
    } else {
      // ANDROID/iOS: Bypass Blob, use raw ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64', 
      });
      
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      fileExt = localUri.split('.').pop() || 'jpg';
      
      // THE FIX: Do not wrap in a Blob! Just use the raw memory buffer.
      fileBody = byteArray.buffer; 
    }
    
    const fileName = `${recordId}.${fileExt}`;
    console.log('📝 Uploading as:', fileName);

    // Upload to Supabase Storage bucket
    const { data, error } = await supabase.storage
      .from('survey_photos')
      .upload(fileName, fileBody, {
        contentType: `image/${fileExt}`, // We explicitly tell Supabase it is an image here
        upsert: true,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return null;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('survey_photos')
      .getPublicUrl(fileName);

    console.log('🔗 Public URL:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Photo upload failed:', error);
    return null;
  }
};