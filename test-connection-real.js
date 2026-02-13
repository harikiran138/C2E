
const { createClient } = require('@supabase/supabase-js');

// Values from .env.local
const supabaseUrl = 'https://ncofwpuabtxddvdjljgj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb2Z3cHVhYnR4ZGR2ZGpsamdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQ0MTQsImV4cCI6MjA4NjQ2MDQxNH0.PxwtYleG7O977lC4uYzatPodJ2GHGAxbMVr263en6ac';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl);
  
  // Try to fetch from 'institutions' table using select count
  // Using head: true to fetch only count and check if table exists
  const { count, error } = await supabase
    .from('institutions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log('Connection Failed or RLS prevented access:', error.message);
    console.log('Full Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Connection Successful!');
    console.log('Institutions Count:', count);
  }
}

testConnection();
