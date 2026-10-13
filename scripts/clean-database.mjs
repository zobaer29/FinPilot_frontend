import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clean() {
  console.log("Wiping all demo records from MongoDB Atlas...");

  const delTx = await prisma.transaction.deleteMany({});
  const delInc = await prisma.incomeSource.deleteMany({});
  const delIncHist = await prisma.incomeHistory.deleteMany({});
  const delBud = await prisma.budget.deleteMany({});
  const delBill = await prisma.bill.deleteMany({});
  const delGoal = await prisma.financialGoal.deleteMany({});
  const delDebt = await prisma.debt.deleteMany({});
  const delSbAcc = await prisma.sandboxAccount.deleteMany({});
  const delSbTx = await prisma.sandboxTransaction.deleteMany({});
  const delRec = await prisma.recommendation.deleteMany({});
  const delAct = await prisma.agentAction.deleteMany({});
  const delAud = await prisma.auditLog.deleteMany({});
  const delUser = await prisma.user.deleteMany({});

  console.log({
    deletedUsers: delUser.count,
    deletedTransactions: delTx.count,
    deletedIncomes: delInc.count,
    deletedIncomeHistories: delIncHist.count,
    deletedBudgets: delBud.count,
    deletedBills: delBill.count,
    deletedGoals: delGoal.count,
    deletedDebts: delDebt.count,
    deletedSandboxAccounts: delSbAcc.count,
    deletedSandboxTransactions: delSbTx.count,
    deletedRecommendations: delRec.count,
    deletedActions: delAct.count,
    deletedAuditLogs: delAud.count,
  });

  console.log("Database successfully cleaned! All demo data has been purged.");
}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
