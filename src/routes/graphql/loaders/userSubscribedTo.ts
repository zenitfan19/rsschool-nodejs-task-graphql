import { PrismaClient } from '@prisma/client';
import DataLoader from 'dataloader';

function createUserSubscribedToLoader(prisma: PrismaClient) {
  return new DataLoader(async (userIds: readonly string[]) => {
    const subs = await prisma.subscribersOnAuthors.findMany({
      where: { subscriberId: { in: userIds as string[] } },
      include: { author: true },
    });
    const map = new Map<string, any[]>();
    for (const sub of subs) {
      if (!map.has(sub.subscriberId)) {
        map.set(sub.subscriberId, []);
      }
      map.get(sub.subscriberId)!.push(sub.author);
    }
    return userIds.map((id) => map.get(id) || []);
  });
}

export { createUserSubscribedToLoader };
