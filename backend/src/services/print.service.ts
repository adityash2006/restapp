import prisma from "../db";

export async function getPendingPrintJobs() {
  return prisma.printJob.findMany({
    where: { status: "PENDING" },
    include: {
      order: {
        include: {
          items: {
            include: { menuItem: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function markPrintJobCompleted(id: number) {
  return prisma.printJob.update({
    where: { id },
    data: {
      status: "COMPLETED",
      processedAt: new Date(),
    },
  });
}

export async function markPrintJobFailed(id: number) {
  return prisma.printJob.update({
    where: { id },
    data: {
      status: "FAILED",
      processedAt: new Date(),
    },
  });
}

export async function getAllPrintJobs() {
  return prisma.printJob.findMany({
    include: {
      order: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
