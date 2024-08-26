// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from "constructs";
import { aws_dynamodb as dynamo, aws_lambda as lambda, aws_lambda_nodejs as lambdanode, aws_cognito as cognito } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

interface HandlerProps {
  connectionIdTable: dynamo.ITable;
  chatHistoryTable: dynamo.ITable;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class Handler extends Construct {
  readonly authHandler: lambda.IFunction;
  readonly websocketHandler: lambda.IFunction;

  constructor(scope: Construct, id: string, props: HandlerProps) {
    super(scope, id);

    const authHandler = new NodejsFunction(this, "AuthHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/authorizer/index.ts",
      environment: {
        USER_POOL_ID: props.userPool.userPoolId,
        APP_CLIENT_ID: props.userPoolClient.userPoolClientId,
      },
      bundling: {
        minify: false,
        // esbuildArgs: { '--platform': 'browser' },
      }
    });

    const websocketHandler = new lambdanode.NodejsFunction(this, "WebSocketHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: "../backend/websocket/index.ts",
      environment: {
        CONNECTION_TABLE_NAME: props.connectionIdTable.tableName,
        CHAT_HISTORY_TABLE_NAME: props.chatHistoryTable.tableName,  // chatHistoryTableの環境変数を追加
      },
    });

    // DynamoDBの読み書き権限を追加
    props.connectionIdTable.grantReadWriteData(websocketHandler);
    props.chatHistoryTable.grantReadWriteData(websocketHandler);

    this.authHandler = authHandler;
    this.websocketHandler = websocketHandler;
  }
}
