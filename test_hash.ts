import * as bcrypt from 'bcrypt';

async function verify() {
  const match = await bcrypt.compare('password123', '$2b$10$4Z4AOZXYc5RPJ21lJ.pXvu/3YxEYWTPgs9l8RwByoIHV7N1vX6WNO');
  console.log("Match first hash:", match);
}

verify();
