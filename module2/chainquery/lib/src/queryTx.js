// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// import the required libraries
import { getHeadersWithAuthorization } from "@acusti/aws-signature-v4";

const NETWORK_GOERLI = "ETHEREUM_GOERLI";
const CQ_REGION = "us-east-1";
const CQ_SERVICE = "managedblockchain-query";
const CQ_ENDPOINT = "https://managedblockchain-query.us-east-1.amazonaws.com";

// call chainquery function
async function callChainQuery(resource, body) {
  const path = `${CQ_ENDPOINT}/${resource}`;

  const signingValues = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: CQ_REGION,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    service: CQ_SERVICE,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };

  const stringifiedBody = JSON.stringify(body);

  const headers = await getHeadersWithAuthorization(
    path,
    { body: stringifiedBody, headers: { method: "POST" }, method: "POST" },
    signingValues
  );

  // fetch the data from the signed request
  return fetch(path, { body: stringifiedBody, headers, method: "POST" });
}

// queryTxLogs function
async function queryLogs(txHash, signingValues) {
  const txBody = {
    transactionHash: txHash,
    network: NETWORK_GOERLI,
  };

  return callChainQuery("list-transaction-events", txBody);

  // const resource = CQ_ENDPOINT + "/list-transaction-events";
  // const body = JSON.stringify(txBody);

  // const headers = await getHeadersWithAuthorization(
  //   resource,
  //   { body, headers: { method: "POST" }, method: "POST" },
  //   signingValues
  // );

  // console.log("Fetching logs for tx", txHash);

  // // fetch the data from the signed request
  // return fetch(resource, { body, headers, method: "POST" });
}

// queryTx function
async function queryTx(address) {
  const txBody = {
    address: address,
    network: NETWORK_GOERLI,
  };

  return callChainQuery("list-transactions", txBody);
}

// lambda handler to return a success response
exports.handler = async (event) => {
  // check for account value and retrieve it
  const account = event.queryStringParameters?.account;
  if (!account) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Account is required",
      }),
    };
  }
  console.log("Querying for account: ", account);

  // query transactions
  const txResponse = await queryTx(account);

  const { transactions } = await txResponse.json();
  console.log(`There are ${transactions?.length} txs in the response.`);

  // query events for each transaction
  const logs = await Promise.all(
    transactions.map(async (tx) => {
      const txLogs = await queryLogs(tx.transactionHash);
      const txLogsJson = await txLogs.json();

      return { ...txLogsJson, timestamp: tx.transactionTimestamp };
    })
  );

  // filter out transaction events for the requested account
  const accountLogs = logs
    .flatMap(({ events, timestamp }) => {
      return (
        events?.flatMap((event) => {
          if (
            event.from?.toLowerCase() == account.toLowerCase() ||
            event.to?.toLowerCase() == account.toLowerCase()
          ) {
            return { ...event, timestamp };
          }

          return [];
        }) || []
      );
    })
    .sort((logA, logB) => logB.timestamp - logA.timestamp);

  const response = {
    statusCode: 200,
    body: JSON.stringify(accountLogs),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    },
  };

  return response;
};
