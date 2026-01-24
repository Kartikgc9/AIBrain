import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users, type User, type NewUser } from '../db/schema.js';
import { createHash, randomBytes } from 'crypto';

export class AuthService {
  /**
   * Hash password using SHA-256
   * In production, use bcrypt or argon2 for better security
   */
  private hashPassword(password: string, salt: string): string {
    return createHash('sha256')
      .update(password + salt)
      .digest('hex');
  }

  /**
   * Generate a random salt
   */
  private generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<User> {
    // Check if user already exists
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }

    // Hash password with salt
    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt) + ':' + salt;

    // Create user
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      settings: {}
    }).returning();

    return user;
  }

  /**
   * Login user and verify credentials
   */
  async login(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    // Extract salt from password hash
    const [hash, salt] = user.passwordHash.split(':');
    const providedHash = this.hashPassword(password, salt);

    if (hash !== providedHash) {
      return null;
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, settings: Record<string, any>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ settings })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    return result.length > 0;
  }
}

export const authService = new AuthService();
