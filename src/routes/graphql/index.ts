import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, validate, parse } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import { createSchema } from './gqlSchema.js';
import { createUserLoader } from './loaders/user.js';
import { createUserSubscribedToLoader } from './loaders/userSubscribedTo.js';
import { createSubscribedToUserLoader } from './loaders/subscribedToUser.js';
import { createProfileLoader } from './loaders/profile.js';
import { createPostsLoader } from './loaders/posts.js';
import { createMemberTypeLoader } from './loaders/memberType.js';
import { MemberType, Post, PrismaClient, Profile, User } from '@prisma/client';
import DataLoader from 'dataloader';

export type Context = {
  prisma: PrismaClient;
  loaders: {
    userLoader: DataLoader<string, User | undefined>;
    profileLoader: DataLoader<string, Profile | null>;
    postsLoader: DataLoader<string, Post[]>;
    memberTypeLoader: DataLoader<string, MemberType | null>;
    userSubscribedToLoader: DataLoader<string, User[]>;
    subscribedToUserLoader: DataLoader<string, User[]>;
  };
};

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;
  const schema = createSchema(prisma);

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const document = parse(req.body.query);
      const validationErrors = validate(schema, document, [depthLimit(5)]);

      if (validationErrors.length > 0) {
        return { errors: validationErrors };
      }

      const context: Context = {
        prisma,
        loaders: {
          userLoader: createUserLoader(prisma),
          userSubscribedToLoader: createUserSubscribedToLoader(prisma),
          subscribedToUserLoader: createSubscribedToUserLoader(prisma),
          profileLoader: createProfileLoader(prisma),
          postsLoader: createPostsLoader(prisma),
          memberTypeLoader: createMemberTypeLoader(prisma),
        },
      };

      return graphql({
        schema,
        source: req.body.query,
        variableValues: req.body.variables,
        contextValue: context,
      });
    },
  });
};

export default plugin;
