# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
FROM ethereum/solc:0.8.20-alpine as solc
FROM ghcr.io/foundry-rs/foundry:latest as foundry
COPY --from=0 /usr/local/bin/solc /usr/local/bin/solc
ENTRYPOINT ["/bin/sh", "-c"]