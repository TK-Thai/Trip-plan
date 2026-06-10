/**
 * Minimum Cash Flow Algorithm
 * คำนวณว่าใครต้องจ่ายใคร เท่าไหร่ ด้วย transactions น้อยที่สุด
 */

export interface ExpenseEntry {
  amount: number;
  paidById: number;
  splits: { memberId: number; shareAmount: number }[];
}

export interface Settlement {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  amount: number;
}

export interface MemberBalance {
  memberId: number;
  name: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = owed money, negative = owes money
}

/**
 * คำนวณ net balance ของแต่ละคน
 */
export function calculateBalances(
  expenses: ExpenseEntry[],
  members: { id: number; name: string }[]
): MemberBalance[] {
  const balanceMap = new Map<number, { totalPaid: number; totalOwed: number }>();

  // Initialize all members
  for (const member of members) {
    balanceMap.set(member.id, { totalPaid: 0, totalOwed: 0 });
  }

  // Calculate totals
  for (const expense of expenses) {
    const payer = balanceMap.get(expense.paidById);
    if (payer) {
      payer.totalPaid += expense.amount;
    }

    for (const split of expense.splits) {
      const member = balanceMap.get(split.memberId);
      if (member) {
        member.totalOwed += split.shareAmount;
      }
    }
  }

  return members.map((m) => {
    const bal = balanceMap.get(m.id)!;
    return {
      memberId: m.id,
      name: m.name,
      totalPaid: Math.round(bal.totalPaid * 100) / 100,
      totalOwed: Math.round(bal.totalOwed * 100) / 100,
      netBalance: Math.round((bal.totalPaid - bal.totalOwed) * 100) / 100,
    };
  });
}

/**
 * Minimum Cash Flow Algorithm
 * ใช้ greedy approach จับคู่ max creditor กับ max debtor
 */
export function calculateSettlements(
  expenses: ExpenseEntry[],
  members: { id: number; name: string }[]
): Settlement[] {
  const balances = calculateBalances(expenses, members);
  const settlements: Settlement[] = [];

  // สร้าง array ของ creditors และ debtors
  const netAmounts = balances.map((b) => ({
    memberId: b.memberId,
    name: b.name,
    amount: b.netBalance,
  }));

  // Greedy: จับคู่ max creditor กับ max debtor ซ้ำจนหมด
  const EPSILON = 0.01;

  while (true) {
    // หา max creditor (owed most)
    let maxCreditor = { memberId: -1, name: "", amount: -Infinity };
    let maxDebtor = { memberId: -1, name: "", amount: Infinity };

    for (const n of netAmounts) {
      if (n.amount > maxCreditor.amount) maxCreditor = n;
      if (n.amount < maxDebtor.amount) maxDebtor = n;
    }

    // ถ้าทั้งคู่ใกล้ 0 แสดงว่าจบแล้ว
    if (maxCreditor.amount < EPSILON && maxDebtor.amount > -EPSILON) break;

    // จำนวนที่ต้องจ่าย = min ของทั้งสอง
    const transferAmount = Math.min(maxCreditor.amount, -maxDebtor.amount);
    const roundedAmount = Math.round(transferAmount * 100) / 100;

    if (roundedAmount > 0) {
      settlements.push({
        fromId: maxDebtor.memberId,
        fromName: maxDebtor.name,
        toId: maxCreditor.memberId,
        toName: maxCreditor.name,
        amount: roundedAmount,
      });
    }

    // Update balances
    maxCreditor.amount -= transferAmount;
    maxDebtor.amount += transferAmount;
  }

  return settlements;
}
