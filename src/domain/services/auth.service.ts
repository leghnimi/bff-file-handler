import jwt, { SignOptions } from 'jsonwebtoken';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { User, UserCredentials } from '../models/user';
import { config } from '../../config';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface AuthService {
  register(username: string, email: string, password: string): Promise<User>;
  login(credentials: UserCredentials): Promise<string>;
  verifyToken(token: string): Promise<any>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(hash: string, password: string): Promise<boolean>;
}

const users: User[] = [];

export class AuthServiceImpl implements AuthService {
  async register(username: string, email: string, password: string): Promise<User> {

    const existingUser = users.find(
      (u) => u.username === username || u.email === email
    );
    
    if (existingUser) {
      throw new AuthenticationError('User already exists');
    }
    
    const hashedPassword = await this.hashPassword(password);
    
    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.push(newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  }

  async login(credentials: UserCredentials): Promise<string> {
    const user = users.find(u => u.username === credentials.username);
    
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }
    
    const isPasswordValid = await this.verifyPassword(user.password, credentials.password);
    
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email 
      },
      config.jwtSecret as jwt.Secret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );
    
    return token;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}

export const authService = new AuthServiceImpl();