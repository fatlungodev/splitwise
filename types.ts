
export type Currency = 'HKD' | 'USD' | 'JPY' | 'TWD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface SplitDetail {
  userId: string;
  amount: number; // in original currency
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number; // original amount
  currency: Currency;
  exchangeRate: number; // rate to base currency
  payerId: string;
  splitDetails: SplitDetail[];
  date: string;
  category: string;
}

export interface Group {
  id: string;
  title: string;
  baseCurrency: Currency;
  members: User[];
  expenses: Expense[];
  date: string;
  icon?: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number; // in base currency
}
