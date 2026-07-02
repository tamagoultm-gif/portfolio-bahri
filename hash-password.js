const bcrypt = require('bcryptjs');

const pwd = process.argv[2];
if (!pwd) {
  console.log('Utilisation : node hash-password.js "TonMotDePasse"');
  process.exit(1);
}

bcrypt.hash(pwd, 12).then((hash) => {
  console.log('\nAjoute cette ligne dans ton fichier .env :\n');
  console.log('ADMIN_PASSWORD_HASH=' + hash + '\n');
});
