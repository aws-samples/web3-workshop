# Welcome to the TheGraph-Service CDK

The CDK to deploy a [The Graph node](https://thegraph.com/) on ECS/EC2, an IPFS node, a managed PostgreSQL database, and an GraphQl API using ApiGateway. The main purpose of this service is to index and prepare the event data coming from the specified smart contracts, map them into a DB schema, store them in the PostgresqlDB in a more efficient form, and allow basic GraphQL queries through the API. The mappings and smart contract definitions are called *subgraph*.

The CDK has one stack in it: **TheGraphServiceStack** provides the [Graph node](https://thegraph.com/). 

This repo has the normal folder structure for a CDK application. In addition to that there is a subfolder worth mentioning. `subgraph` contains the defintion for the subgraphs of the sentences and the genAI NFTs. Once the ghraph is running, the subgraphs need to be deployed. Then the node will start indexing them. 

# Network Support
TheGraph-Service has support for the following networks (chain IDs)

* Ethereum mainnet (1)
* Ethereum ropsten (3)
* Ethereum rinkeby (4)
* Ethereum goerli (5)
* Polygon mumbai (80001)
* Polygon matic (137)

For our purposes, we are deploying to Goerli, so the chainId should be 5. It will be taken from the `/web3/chain_id` parameter in Parameter Store.

# Setup
Please install all the needed npm packages of the TheGraph-Service CDK

```
$ npm install
```

```
$ cdk list
```

You can now deploy the whole stack with the following command
```
$ cdk deploy TheGraph-Service
```

# Deploy a subgraph
For the deployment of the a subgraph follow the steps of the [README](subgraph/README.md) in the `/subgraph` folder!

# Access to the GraphQL API
There are two ways of accessing the Graph node: 
1. directly from the cloud9 instance: The cloud9 instance has direct access to the Graph node's EC2. From the cloud9 instance you can directly deploy the subgraphs and managed the graph node. 
2. For external queries, the graph's endpoints are exposed via API GW. There are two routes on the API GW: 
   1. `POST <base-url>/subgraphs/name/{subgraphName}`: This route accepts valid subgraphnames as path element. It is used for queries on the specific subgraph.
   2. `POST <base-url>/graphql`: This route is for status queries about the syncing status of the graph node. 

You can always lookup the API's **base-url** of the TheGraph-Service on the AWS ParameterStore. It is stored at `/indexer/queryEndpoint` and should look like  `https://<API ID>.execute-api.<region>.amazonaws.com`.

Remark: If you access it using the browser, you will simply get a "message: Not found" response. The API accepts POST requests only.

# GraphQL API Schema
You can lookup and review the GraphQL Schema in [schema.graphql](subgraph/boredApes_simple/schema.graphql).

# Tear-down of TheGraph-Service

```
$ cdk destroy TheGraph-Service
```
