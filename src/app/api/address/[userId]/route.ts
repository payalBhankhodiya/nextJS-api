import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: { userId: string } },
) {
  const addresses = await prisma.address.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(addresses);
}