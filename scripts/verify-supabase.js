const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  console.log(`Connecting to Supabase at ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Attempting to query institutions table...');
    const { data, error } = await supabase.from('institutions').select('count', { count: 'exact', head: true });
    
    if (error) {
       console.log('Connection established but query failed (likely RLS or missing table):', error.message);
       if (error.message.includes('FetchError') || error.message.includes('connection refused')) {
           console.error('CRITICAL: Supabase URL unreachable.');
           process.exit(1);
       }
    } else {
        console.log('Supabase connection successful! Table "institutions" is accessible.');
    }

    // Check programs table
    console.log('Checking "programs" table...');
    const { error: progError } = await supabase.from('programs').select('count', { count: 'exact', head: true });
    if (progError) {
        console.error('Table "programs" check failed:', progError.message);
    } else {
        console.log('Table "programs" is accessible.');
    }

    // Check peo_sets table
    console.log('Checking "peo_sets" table...');
    const { error: peoError } = await supabase.from('peo_sets').select('count', { count: 'exact', head: true });
    if (peoError) {
        console.error('Table "peo_sets" check failed:', peoError.message);
    } else {
        console.log('Table "peo_sets" is accessible.');
    }
    
    console.log('Supabase schema verification complete.');

  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    process.exit(1);
  }
}

testConnection();
