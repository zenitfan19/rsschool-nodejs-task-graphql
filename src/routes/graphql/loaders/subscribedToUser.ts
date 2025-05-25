import { PrismaClient } from '@prisma/client';
import DataLoader from 'dataloader';

function createSubscribedToUserLoader(prisma: PrismaClient) {
  return new DataLoader(async (authorIds: readonly string[]) => {
    const subs = await prisma.subscribersOnAuthors.findMany({
      where: { authorId: { in: authorIds as string[] } },
      include: { subscriber: true },
    });
    const map = new Map<string, any[]>();
    for (const sub of subs) {
      if (!map.has(sub.authorId)) {
        map.set(sub.authorId, []);
      }
      map.get(sub.authorId)!.push(sub.subscriber);
    }
    return authorIds.map((id) => map.get(id) || []);
  });
}

export { createSubscribedToUserLoader };
