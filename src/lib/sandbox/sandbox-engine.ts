export interface SandboxAccountState {
  id: string;
  name: string;
  balance: number;
  type: "CHECKING" | "SAVINGS" | "EMERGENCY" | "GOAL";
}

export interface SandboxTransactionRecord {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  status: "COMPLETED" | "FAILED" | "BLOCKED";
  reference: string;
  timestamp: string;
  description: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  eventType: "CSV_IMPORT" | "ANALYSIS_RUN" | "PROBLEM_CLASSIFIED" | "RECOMMENDATION_GENERATED" | "PLAN_APPROVED" | "PLAN_REJECTED" | "SANDBOX_TRANSFER" | "BUDGET_UPDATED";
  description: string;
  metadata?: Record<string, unknown>;
}

export class SandboxEnvironment {
  private accounts: SandboxAccountState[] = [
    { id: "sb-1", name: "Available Balance", balance: 35000, type: "CHECKING" },
    { id: "sb-2", name: "General Savings", balance: 60000, type: "SAVINGS" },
    { id: "sb-3", name: "Emergency Fund", balance: 25000, type: "EMERGENCY" },
    { id: "sb-4", name: "Laptop Fund", balance: 20000, type: "GOAL" },
  ];

  private transactions: SandboxTransactionRecord[] = [];
  private auditLogs: AuditRecord[] = [
    {
      id: "aud-001",
      timestamp: "10:42 AM",
      eventType: "CSV_IMPORT",
      description: "Transaction CSV statement imported (6 transactions)",
    },
    {
      id: "aud-002",
      timestamp: "10:43 AM",
      eventType: "ANALYSIS_RUN",
      description: "Financial health analysis score calculated: 75/100",
    },
  ];

  public getAccounts(): SandboxAccountState[] {
    return [...this.accounts];
  }

  public getTransactions(): SandboxTransactionRecord[] {
    return [...this.transactions];
  }

  public getAuditLogs(): AuditRecord[] {
    return [...this.auditLogs];
  }

  public addAuditLog(
    eventType: AuditRecord["eventType"],
    description: string,
    metadata?: Record<string, unknown>
  ): AuditRecord {
    const record: AuditRecord = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      eventType,
      description,
      metadata,
    };
    this.auditLogs.unshift(record);
    return record;
  }

  public executeTransfer(
    fromAccountName: string,
    toAccountName: string,
    amount: number
  ): { success: boolean; transaction?: SandboxTransactionRecord; error?: string } {
    const from = this.accounts.find((a) => a.name === fromAccountName);
    const to = this.accounts.find((a) => a.name === toAccountName);

    if (!from || !to) {
      return { success: false, error: "One or both accounts not found in sandbox" };
    }

    if (from.balance < amount) {
      return { success: false, error: `Insufficient funds in ${fromAccountName} (Available: ৳${from.balance})` };
    }

    from.balance -= amount;
    to.balance += amount;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const reference = `FP-${dateStr}-${randomSeq}`;

    const tx: SandboxTransactionRecord = {
      id: `tx-${Date.now()}`,
      fromAccount: fromAccountName,
      toAccount: toAccountName,
      amount,
      status: "COMPLETED",
      reference,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      description: `Transferred ৳${amount.toLocaleString()} from ${fromAccountName} to ${toAccountName}`,
    };

    this.transactions.unshift(tx);
    this.addAuditLog("SANDBOX_TRANSFER", tx.description, { reference, fromAccountName, toAccountName, amount });

    return { success: true, transaction: tx };
  }
}

export const defaultSandbox = new SandboxEnvironment();
