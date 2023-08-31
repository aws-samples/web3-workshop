// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as log4js from 'log4js';

function getLogger() {
  const logger = log4js.getLogger();
  logger.level = process.env.LOG_LEVEL || 'debug';

  return logger;
}

const logger = getLogger();

export default logger;
