// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager')
const {
  jenkinsArtifactsBounds,
} = require('aws-cdk-lib/aws-codepipeline-actions')
const { Client } = require('pg')

const secretsManager = new SecretsManagerClient()

exports.handler = async (event, context) => {
  // Retrieve the secret ARN from the environment variable
  // const secretArn = process.env.DB_SECRET_ARN
  // const dbName = process.env.DB_NAME

  const secretArn = event.ResourceProperties.secretArn
  const dbName = event.ResourceProperties.dbName
  const dbHost = event.ResourceProperties.dbHost
  const dbPort = event.ResourceProperties.dbPort

  const response = {}

  try {
    switch (event.RequestType) {
      case 'Create':
        // Retrieve the secret value from Secrets Manager
        const response = await secretsManager.send(
          new GetSecretValueCommand({
            SecretId: secretArn,
          })
        )

        // Parse the secret value as JSON
        const secretValue = JSON.parse(response.SecretString)

        // connect to DB cluster
        const dbClient = new Client({
          host: dbHost,
          port: dbPort,
          user: secretValue.username,
          password: secretValue.password,
          database: 'postgres',
          ssl: true,
        })

        // Connect to the PostgreSQL database
        await dbClient.connect()

        // Create a new database
        await dbClient.query(
          "CREATE DATABASE the_graph_db ENCODING = 'UTF8' LC_COLLATE = 'C' LC_CTYPE = 'C' TEMPLATE template0"
        )

        console.log(`Created database ${dbName}`)

        // Disconnect from the PostgreSQL database
        await dbClient.end()

        // Return a success message as the function's output
        return 'Database created successfully'

      default:
        return {}
    }
  } catch (error) {
    console.error(error)

    // Return an error message as the function's output
    throw new Error(error.message)
  }
}
