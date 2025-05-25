import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

function createMemberTypeLoader(prisma: PrismaClient) {
  return new DataLoader(async (ids: readonly string[]) => {
    const memberTypes = await prisma.memberType.findMany({
      where: { id: { in: ids as string[] } },
    });
    const memberTypeMap = new Map(memberTypes.map((mt) => [mt.id, mt]));
    return ids.map((id) => memberTypeMap.get(id) || null);
  });
}

export { createMemberTypeLoader };
