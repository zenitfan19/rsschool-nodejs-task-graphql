import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

function createProfileLoader(prisma: PrismaClient) {
  return new DataLoader(async (userIds: readonly string[]) => {
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: userIds as string[] } },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    return userIds.map((id) => profileMap.get(id) || null);
  });
}

export { createProfileLoader };
