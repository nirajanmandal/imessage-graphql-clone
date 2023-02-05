import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema'
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';
import * as dotenv from 'dotenv'
import { getSession } from 'next-auth/react'
import { GraphQLContext, Session } from './util/types';
import { PrismaClient } from '@prisma/client';

interface MyContext {
    token?: string;
}

async function main() {
    dotenv.config()
    const app = express();
    const httpServer = http.createServer(app);
    const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
    })

    const corsOptions = {
        origin: process.env.CLIENT_ORIGIN,
        credentials: true,
    }
    
    const prisma = new PrismaClient()
    
    const server = new ApolloServer<MyContext>({
        schema,
        csrfPrevention: true,
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer })],
    });
    await server.start();

    app.use(
        '/',
        cors<cors.CorsRequest>(corsOptions),
        bodyParser.json(),
        expressMiddleware(server, {
            context: async ({ req }): Promise<GraphQLContext> => {
                const session = await getSession({ req })
                return { session: session as Session, prisma }
            },
        }),
    );

    await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
    console.log(`🚀 Server ready at http://localhost:4000/`);
}

main().catch((err) => console.log('error::', err))