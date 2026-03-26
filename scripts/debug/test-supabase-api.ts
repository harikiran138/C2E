import { createClient } from '../../utils/supabase/server';

async function test() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('institutions').select('id').limit(1);
    if (error) {
      console.error('Supabase Error:', error);
    } else {
      console.log('Supabase Success:', data);
    }
  } catch (err) {
    console.error('Runtime Error:', err);
  }
}

test();
