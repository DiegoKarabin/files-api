import { User } from '../users/entities/user.entity';

export const createMockUser = (overrides = {}): Partial<User> => ({
  id: '123',
  email: 'test@test.com',
  password: 'password123',
  files: [],
  createdAt: new Date('2025-03-26T07:48:15.904Z'),
  updatedAt: new Date('2025-03-26T07:48:15.904Z'),
  ...overrides
});
