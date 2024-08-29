// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from "constructs";
import { aws_dynamodb as dynamo, RemovalPolicy } from "aws-cdk-lib";

export class Storage extends Construct {
  readonly connectionIdTable: dynamo.ITable;
  readonly chatHistoryTable: dynamo.ITable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ConnectionIdTableの定義
    const connectionIdTable = new dynamo.Table(this, "ConnectionIdTable", {
      partitionKey: { name: "connectionId", type: dynamo.AttributeType.STRING },
      timeToLiveAttribute: "removedAt",
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    connectionIdTable.addGlobalSecondaryIndex({
      partitionKey: { name: "userId", type: dynamo.AttributeType.STRING },
      indexName: "userIdIndex",
    });

    this.connectionIdTable = connectionIdTable;

    // ChatHistoryTableの定義
    const chatHistoryTable = new dynamo.Table(this, "ChatHistoryTable", {
      partitionKey: { name: "roomId", type: dynamo.AttributeType.STRING }, // チャットルームID
      sortKey: { name: "timestamp", type: dynamo.AttributeType.STRING }, // タイムスタンプ（チャットメッセージの順序）
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    chatHistoryTable.addGlobalSecondaryIndex({
      partitionKey: { name: "userId", type: dynamo.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamo.AttributeType.STRING },
      indexName: "UserIdIndex",
    });

    this.chatHistoryTable = chatHistoryTable;
  }
}
