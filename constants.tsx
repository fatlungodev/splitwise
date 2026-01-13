
import { User, Currency } from './types';

export const CURRENCIES: Currency[] = ['HKD', 'USD', 'JPY', 'TWD', 'EUR', 'GBP'];

export const CATEGORIES = [
  { name: 'Food', icon: 'fa-utensils', color: 'bg-orange-500' },
  { name: 'Transport', icon: 'fa-car', color: 'bg-blue-500' },
  { name: 'Hotel', icon: 'fa-hotel', color: 'bg-purple-500' },
  { name: 'Entertainment', icon: 'fa-gamepad', color: 'bg-pink-500' },
  { name: 'Shopping', icon: 'fa-shopping-bag', color: 'bg-emerald-500' },
  { name: 'Others', icon: 'fa-ellipsis-h', color: 'bg-gray-500' },
];

export const getAssetPath = (path: string) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}${path}`;
};

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice', avatar: getAssetPath('/avatars/alice.jpg') },
  { id: 'u2', name: 'Bob', avatar: getAssetPath('/avatars/bob.jpg') },
  { id: 'u3', name: 'Charlie', avatar: getAssetPath('/avatars/charlie.jpg') },
];

export const EXCHANGE_RATES: Record<Currency, number> = {
  HKD: 1,
  USD: 7.8,
  JPY: 0.052,
  TWD: 0.24,
  EUR: 8.4,
  GBP: 9.8,
};
