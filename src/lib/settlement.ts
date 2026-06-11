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
 * Pairwise Net Balance Algorithm
 * คำนวณแบบตรงไปตรงมา ใครติดเงินใครในแต่ละบิล หักลบกันแค่สองคนนั้น (ไม่จับคู่ข้ามคนแบบ Simplify Debts)
 * ทำให้ยอดที่โอนตรงกับบิลที่หารกันเป๊ะๆ ป้องกันการสับสน
 */
export function calculateSettlements(
  expenses: ExpenseEntry[],
  members: { id: number; name: string }[]
): Settlement[] {
  // owes[debtor][creditor] = amount
  const owes = new Map<number, Map<number, number>>();
  members.forEach((m) => owes.set(m.id, new Map()));

  // 1. รวมยอดหนี้ทั้งหมดแบบตรงไปตรงมา
  for (const expense of expenses) {
    const creditor = expense.paidById;
    for (const split of expense.splits) {
      const debtor = split.memberId;
      if (debtor !== creditor && owes.has(debtor)) {
        const current = owes.get(debtor)!.get(creditor) || 0;
        owes.get(debtor)!.set(creditor, current + split.shareAmount);
      }
    }
  }

  const settlements: Settlement[] = [];

  // 2. หักลบยอดระหว่างคู่ (Pairwise net balance)
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];

      const aOwesB = owes.get(a.id)!.get(b.id) || 0;
      const bOwesA = owes.get(b.id)!.get(a.id) || 0;

      const net = aOwesB - bOwesA;
      
      if (Math.abs(net) > 0.01) {
        const roundedNet = Math.round(Math.abs(net) * 100) / 100;
        if (net > 0) {
          // a owes b
          settlements.push({
            fromId: a.id,
            fromName: a.name,
            toId: b.id,
            toName: b.name,
            amount: roundedNet,
          });
        } else {
          // b owes a
          settlements.push({
            fromId: b.id,
            fromName: b.name,
            toId: a.id,
            toName: a.name,
            amount: roundedNet,
          });
        }
      }
    }
  }

  // Sort by fromName so the same person's debts are grouped together
  settlements.sort((a, b) => {
    if (a.fromName !== b.fromName) {
      return a.fromName.localeCompare(b.fromName);
    }
    return a.toName.localeCompare(b.toName);
  });

  return settlements;
}
