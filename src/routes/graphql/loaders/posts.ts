import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

function createPostsLoader(prisma: PrismaClient) {
  return new DataLoader(async (authorIds: readonly string[]) => {
    const posts = await prisma.post.findMany({
      where: { authorId: { in: authorIds as string[] } },
    });
    const postsMap = new Map<string, any[]>();
    posts.forEach((post) => {
      if (!postsMap.has(post.authorId)) {
        postsMap.set(post.authorId, []);
      }
      postsMap.get(post.authorId)!.push(post);
    });
    return authorIds.map((id) => postsMap.get(id) || []);
  });
}

export { createPostsLoader };
