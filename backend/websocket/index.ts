// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ConnectionTableName = process.env.CONNECTION_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event, context) => {
  console.log(event);
  const routeKey = event.requestContext.routeKey!;
  const connectionId = event.requestContext.connectionId!;

  if (routeKey == "$connect") {
    const userId = event.requestContext.authorizer!.userId;

    try {
      await client.send(
        new PutCommand({
          TableName: ConnectionTableName,
          Item: {
            userId: userId,
            connectionId: connectionId,
            removedAt: Math.ceil(Date.now() / 1000) + 3600 * 3,
          },
        }),
      );
      return { statusCode: 200, body: "Connected." };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: "Connection failed." };
    }
  }
  if (routeKey == "$disconnect") {
    try {
      await removeConnectionId(connectionId);
      return { statusCode: 200, body: "Disconnected." };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: "Disconnection failed." };
    }
  }

  if (routeKey === "sendmessage") {
    try {
      const body = JSON.parse(event.body || '{}');
      const message = body.data?.message || 'Empty message';

      const connections = await client.send(new ScanCommand({ TableName: ConnectionTableName }));
      const apiGateway = new ApiGatewayManagementApiClient({
        endpoint: getEndpoint(event.requestContext),
      });

      console.log('connections.Items:', connections.Items);

      const postCalls = connections.Items?.map(async (connection) => {
        try {
          await apiGateway.send(new PostToConnectionCommand({
            ConnectionId: connection.connectionId,
            Data: Buffer.from(JSON.stringify({ message: message + " conId:" + connection.connectionId + "sender:" + connectionId }), 'utf-8'),
          }));
          console.log(`Message sent to ${connection.connectionId}`);
        } catch (e: any) {
          if (e.$metadata && e.$metadata.httpStatusCode === 410) {
            await removeConnectionId(connection.connectionId);
          } else {
            console.error(`Error sending message to ${connection.connectionId}:`, e);
          }
        }
      }) || [];

      console.log('postCalls:', postCalls);

      await Promise.all(postCalls);

      return { statusCode: 200, body: "Message sent." };
    } catch (err) {
      console.error('Error sending message:', err);
      return { statusCode: 500, body: "Failed to send message." };
    }
  }
  // その他のルートは処理しない
  return { statusCode: 400, body: "Invalid route." };
};

const removeConnectionId = async (connectionId: string) => {
  console.log(`Removing connectionId: ${connectionId}`);
  return await client.send(
    new DeleteCommand({
      TableName: ConnectionTableName,
      Key: {
        connectionId,
      },
    }),
  );
};

const getEndpoint = (requestContext: any): string => {
  const domainName = requestContext.domainName!;
  return domainName.endsWith("amazonaws.com")
    ? `https://${requestContext.domainName}/${requestContext.stage}`
    : `https://${requestContext.domainName}`;
};