import mongoose from 'mongoose';

export async function connectDb(uri) {
  // Falla rápido si Mongo no responde, en vez de dejar peticiones colgadas.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
