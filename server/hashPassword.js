const bcrypt = require('bcryptjs');

const password = '@Rakib112358'; 
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Hashed password:', hash);
});