import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    hello: {
      type: GraphQLString,
      resolve: () => 'Hello World!',
    },
  },
});

const schema = new GraphQLSchema({
  query: QueryType,
});

export { schema };
