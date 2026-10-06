import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Costo de bcrypt: cada +1 duplica el tiempo de cálculo. 12 es un buen equilibrio hoy.
const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    // Nunca se guarda la contraseña: solo su hash (no reversible).
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'qa'], default: 'qa' },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
};

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
