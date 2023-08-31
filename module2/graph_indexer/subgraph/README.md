# Deploying a Subgraph
The Graph node works with so-called _subgraphs_. They specifiy the smart contract(s) to index and the mapping that is used to store data in the DB. To define a subgraph, you need to define _GraphQL schema, subgraph configuration,_ and _mapping to DB_. Once you have a defined subgraph, it needs to be deployed to the graph node, so that it starts indexing. 

## Prerequisites
To manage subgraphs, you will need the Graph CLI. you can install it globally for easy access with:

```
npm install -g @graphprotocol/graph-cli
```

## Using the existing subgraphs
There are two subgraphs in the subgraphs folder: `sentences` and `genAI`. They are meant for the two collections that you are minting. The subgraphs are setup to index the collections on a full-node using the data that is supplied via events. Before the graph node can start indexing them, they need to be adapted to your deployment of the smart contract. 

### ACTION: Update the subgraph definitions
The graph node must know the smart contract address of a smart contract that it should index as well as the starting block for the index. Both of these are set in the `subgraph.yaml`, which holds the configuration for the graph node for the particular subgraph. The file needs to be modified in two places. At the `dataSources[0]/source/address` node must be set to the smart contract address, the `dataSources[0]/source/startBlock` must be set to the blocknumber of the contract's deployment. Those are lines 9 and 11 in the file. The file's start should look like this:

```
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: SentencesNFT
    network: goerli
    source:
      address: "0x4Bb49799C0659CE4FdAD6eB831748e9F28FC0750"
      abi: SentencesNFT
      startBlock: 9266269
```
The values for the contract addresses can be found in the parameter store under `/web3/contracts/erc721/genai` and `/web3/contracts/erc721/sentences` respectively. To get the starting block, you can look that up on [Etherscan](https://goerli.etherscan.io/) by searching for the contract address. Under transactions you can see at which block the contract was deployed. That should be the starting block for the indexer. 

## Deploying the subgraph
After it has been defined, the subgraph needs to be deployed to the node. This consists of three steps: _building, creating,_ and _deploying._ The Graph CLI helps with that. 
1. **Building the subgraph:** `graph codegen` builds the subgraph. This will create a generated folder, which has all the files needed to deploy the subgraph. Whenever there is a modification to the subgraph it needs to be re-built.
2. **Creating the subgraph on the node:** `graph create --node http://<IP OF GRAPH NODE EC2>:8020/<NAME OF SUBGRAPH>` will create the subgraph on our node. This is a one time action. The names for the subgraphs should be `genAI` and `sentences` respectively.
3. **Deploy the subgraph to the node:** `graph deploy --node http://<IP OF GRAPH NODE EC2>:8020/ --ipfs http://<IP OF GRAPH NODE EC2>:5001 <NAME OF SUBGRAPH>` will deploy the subgraph to the node. It asks a couple of questions, namely the version of the subgraph. This is needed if we update our subgraph and want to provide a new version. Once this command has finished, the graph has been deployed and the node will start indexing. 

# Querying a subgraph
Once the subgraph has been deployed, it can be queried via GraphQL. From the development machine, you can query the EC2 directly. Contrary to the output of the `graph deploy` command, the GraphQL is reachable on port 80 (i.e. directly on the EC2 IP) and not on port 8080 (which is used on the docker container, running on EC2). From the dev machine, the GraphQL endpoint is `http://<EC2 IP>/subgraphs/name/<NAME OF SUBGRAPH>`. For external access to the graph node use the API Gateway as described in [project's README.md](../README.md#Access-to-the-GraphQL-API).