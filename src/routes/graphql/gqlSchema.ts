import { PrismaClient } from '@prisma/client';
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLList,
  GraphQLEnumType,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLResolveInfo,
} from 'graphql';
import { UUIDType } from './types/uuid.js';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import { Context } from './index.js';

const MemberTypeIdEnum = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    BASIC: { value: 'BASIC' },
    BUSINESS: { value: 'BUSINESS' },
  },
});

const MemberType = new GraphQLObjectType({
  name: 'MemberType',
  fields: {
    id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    discount: { type: new GraphQLNonNull(GraphQLFloat) },
    postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

const PostType = new GraphQLObjectType({
  name: 'Post',
  fields: {
    id: { type: new GraphQLNonNull(UUIDType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const ProfileType = new GraphQLObjectType({
  name: 'Profile',
  fields: {
    id: { type: new GraphQLNonNull(UUIDType) },
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(UUIDType) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    memberType: {
      type: new GraphQLNonNull(MemberType),
      resolve: (parent, _, context: Context) =>
        context.loaders.memberTypeLoader.load(parent.memberTypeId),
    },
  },
});

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostType))),
      resolve: (parent, _, context: Context) =>
        context.loaders.postsLoader.load(parent.id),
    },
    profile: {
      type: ProfileType,
      resolve: (parent, _, context: Context) =>
        context.loaders.profileLoader.load(parent.id),
    },
    subscribedToUser: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: (parent, _, context: Context) =>
        context.loaders.subscribedToUserLoader.load(parent.id),
    },
    userSubscribedTo: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: (parent, _, context: Context) =>
        context.loaders.userSubscribedToLoader.load(parent.id),
    },
  }),
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    memberTypes: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberType))),
      resolve: (_, args, context: Context) => context.prisma.memberType.findMany(),
    },
    memberType: {
      type: MemberType,
      args: {
        id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
      },
      resolve: (_, args, context: Context) =>
        context.prisma.memberType.findUnique({
          where: { id: args.id },
        }),
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostType))),
      resolve: (_, args, context: Context) => context.prisma.post.findMany(),
    },
    post: {
      type: PostType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: (_, args, context: Context) =>
        context.prisma.post.findUnique({
          where: { id: args.id },
        }),
    },
    profiles: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ProfileType))),
      resolve: (_, args, context: Context) => context.prisma.profile.findMany(),
    },
    profile: {
      type: ProfileType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: (_, args, context: Context) =>
        context.prisma.profile.findUnique({
          where: { id: args.id },
        }),
    },
    users: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: async (_, args, context: Context, info: GraphQLResolveInfo) => {
        const parsedInfo = parseResolveInfo(info);
        const fields = parsedInfo?.fieldsByTypeName?.User ?? {};

        const needSubscribedToUser = 'subscribedToUser' in fields;
        const needUserSubscribedTo = 'userSubscribedTo' in fields;

        const users = await context.prisma.user.findMany({
          include: {
            subscribedToUser: needSubscribedToUser,
            userSubscribedTo: needUserSubscribedTo,
          },
        });

        users.forEach((user) => {
          context.loaders.userLoader.prime(user.id, user);

          if (needUserSubscribedTo && user.userSubscribedTo) {
            const authorIds = user.userSubscribedTo.map((sub) => sub.authorId);
            const authors = users.filter((u) => authorIds.includes(u.id));
            context.loaders.userSubscribedToLoader.prime(user.id, authors);
          }

          if (needSubscribedToUser && user.subscribedToUser) {
            const subscriberIds = user.subscribedToUser.map((sub) => sub.subscriberId);
            const subscribers = users.filter((u) => subscriberIds.includes(u.id));
            context.loaders.subscribedToUserLoader.prime(user.id, subscribers);
          }
        });
        return users;
      },
    },
    user: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: (_, args, context: Context) =>
        context.prisma.user.findUnique({
          where: { id: args.id },
        }),
    },
  },
});

const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: {
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    userId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: {
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    memberTypeId: { type: MemberTypeIdEnum },
  },
});

const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: {
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  },
});

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createPost: {
      type: new GraphQLNonNull(PostType),
      args: {
        dto: { type: new GraphQLNonNull(CreatePostInput) },
      },
      resolve: (_, { dto }, context: Context) =>
        context.prisma.post.create({
          data: dto,
        }),
    },

    changePost: {
      type: PostType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangePostInput) },
      },
      resolve: (_, { id, dto }, context: Context) =>
        context.prisma.post.update({
          where: { id },
          data: dto,
        }),
    },

    deletePost: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_, args, context: Context) => {
        await context.prisma.post.delete({
          where: { id: args.id },
        });
        return `Post with id ${args.id} was deleted`;
      },
    },

    createProfile: {
      type: new GraphQLNonNull(ProfileType),
      args: {
        dto: { type: new GraphQLNonNull(CreateProfileInput) },
      },
      resolve: (_, { dto }, context: Context) =>
        context.prisma.profile.create({
          data: dto,
        }),
    },

    changeProfile: {
      type: ProfileType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeProfileInput) },
      },
      resolve: (_, { id, dto }, context: Context) =>
        context.prisma.profile.update({
          where: { id },
          data: dto,
        }),
    },

    deleteProfile: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_, args, context: Context) => {
        await context.prisma.profile.delete({
          where: { id: args.id },
        });
        return `Profile with id ${args.id} was deleted`;
      },
    },

    createUser: {
      type: new GraphQLNonNull(UserType),
      args: {
        dto: { type: new GraphQLNonNull(CreateUserInput) },
      },
      resolve: (_, { dto }, context: Context) =>
        context.prisma.user.create({
          data: dto,
        }),
    },

    changeUser: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeUserInput) },
      },
      resolve: (_, { id, dto }, context: Context) =>
        context.prisma.user.update({
          where: { id },
          data: dto,
        }),
    },

    deleteUser: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_, args, context: Context) => {
        await context.prisma.user.delete({
          where: { id: args.id },
        });
        return `User with id ${args.id} was deleted`;
      },
    },

    subscribeTo: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_, { userId, authorId }, context: Context) => {
        await context.prisma.subscribersOnAuthors.create({
          data: {
            subscriberId: userId,
            authorId: authorId,
          },
        });
        return `User with id ${userId} subscribed to user with id ${authorId}`;
      },
    },

    unsubscribeFrom: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_, { userId, authorId }, context: Context) => {
        await context.prisma.subscribersOnAuthors.delete({
          where: {
            subscriberId_authorId: {
              subscriberId: userId,
              authorId: authorId,
            },
          },
        });
        return `User with id ${userId} unsubscribed from user with id ${authorId}`;
      },
    },
  },
});

export const createSchema = (prisma: PrismaClient) =>
  new GraphQLSchema({
    query: QueryType,
    mutation: MutationType,
  });
