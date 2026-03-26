
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('Testing Auth to:', supabaseUrl)
  const email = `test_${Math.random().toString(36).substring(7)}@example.com`
  const password = 'Password123!'
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Auth Error:', error.message)
  } else {
    console.log('Auth Success! User created:', data.user?.id)
    
    // Clean up if possible (though we can't easily delete auth users with anon key)
    console.log('Note: User created in Supabase Auth. Please delete manually if needed.')
  }
}

testAuth()
