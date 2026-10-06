// Crea o actualiza un usuario del portal.
//   npm run user:create -- --email ana@empresa.com --name "Ana Pérez" --role qa
// La contraseña se pide por consola (no se pasa como argumento para que no quede en el
// historial de comandos).
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string', default: 'qa' },
  },
});

if (!values.email || !values.name || !['admin', 'qa'].includes(values.role)) {
  console.error('Uso: npm run user:create -- --email <correo> --name "<nombre>" [--role qa|admin]');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('Contraseña (mínimo 12 caracteres): ');
rl.close();

if (password.length < 12) {
  console.error('La contraseña debe tener al menos 12 caracteres.');
  process.exit(1);
}

await connectDb(env.MONGODB_URI);
let user = await User.findOne({ email: values.email.toLowerCase() });
const isNew = !user;
user ??= new User({ email: values.email });
user.set({ name: values.name, role: values.role, active: true });
await user.setPassword(password);
await user.save();
console.log(`${isNew ? 'Creado' : 'Actualizado'}: ${user.email} (${user.role})`);
await disconnectDb();
