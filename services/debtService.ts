
import { Group, Settlement } from '../types';

export function calculateSimplifiedDebts(group: Group): Settlement[] {
  const balances: Record<string, number> = {};

  // Initialize all members with 0 balance
  group.members.forEach(m => (balances[m.id] = 0));

  // Sum up all expenses
  group.expenses.forEach(expense => {
    const amountInBase = expense.amount * expense.exchangeRate;
    
    // Payer is owed money
    balances[expense.payerId] += amountInBase;

    // Splitters owe money
    expense.splitDetails.forEach(split => {
      const splitAmountInBase = split.amount * expense.exchangeRate;
      balances[split.userId] -= splitAmountInBase;
    });
  });

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([userId, balance]) => {
    if (balance > 0.01) creditors.push({ id: userId, amount: balance });
    else if (balance < -0.01) debtors.push({ id: userId, amount: Math.abs(balance) });
  });

  const settlements: Settlement[] = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const settlementAmount = Math.min(d.amount, c.amount);

    settlements.push({
      from: d.id,
      to: c.id,
      amount: settlementAmount
    });

    d.amount -= settlementAmount;
    c.amount -= settlementAmount;

    if (d.amount < 0.01) i++;
    if (c.amount < 0.01) j++;
  }

  return settlements;
}
