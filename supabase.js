import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obzeqgfqjupjusduwnhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemVxZ2ZxanVwanVzZHV3bmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTIzNDQsImV4cCI6MjA5MDUyODM0NH0.swq9CjovEZ-mGI7gWnWEIQsH3M70ciO2M6lo8Y2v2qg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);