#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
ENTRYPOINT_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "preOpGas", "type": "uint256"},
            {"internalType": "uint256", "name": "paid", "type": "uint256"},
            {"internalType": "uint48", "name": "validAfter", "type": "uint48"},
            {"internalType": "uint48", "name": "validUntil", "type": "uint48"},
            {"internalType": "bool", "name": "targetSuccess", "type": "bool"},
            {"internalType": "bytes", "name": "targetResult", "type": "bytes"},
        ],
        "name": "ExecutionResult",
        "type": "error",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "opIndex", "type": "uint256"},
            {"internalType": "string", "name": "reason", "type": "string"},
        ],
        "name": "FailedOp",
        "type": "error",
    },
    {
        "inputs": [{"internalType": "address", "name": "sender", "type": "address"}],
        "name": "SenderAddressResult",
        "type": "error",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "aggregator", "type": "address"}
        ],
        "name": "SignatureValidationFailed",
        "type": "error",
    },
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "uint256", "name": "preOpGas", "type": "uint256"},
                    {"internalType": "uint256", "name": "prefund", "type": "uint256"},
                    {"internalType": "bool", "name": "sigFailed", "type": "bool"},
                    {"internalType": "uint48", "name": "validAfter", "type": "uint48"},
                    {"internalType": "uint48", "name": "validUntil", "type": "uint48"},
                    {
                        "internalType": "bytes",
                        "name": "paymasterContext",
                        "type": "bytes",
                    },
                ],
                "internalType": "struct IEntryPoint.ReturnInfo",
                "name": "returnInfo",
                "type": "tuple",
            },
            {
                "components": [
                    {"internalType": "uint256", "name": "stake", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "unstakeDelaySec",
                        "type": "uint256",
                    },
                ],
                "internalType": "struct IStakeManager.StakeInfo",
                "name": "senderInfo",
                "type": "tuple",
            },
            {
                "components": [
                    {"internalType": "uint256", "name": "stake", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "unstakeDelaySec",
                        "type": "uint256",
                    },
                ],
                "internalType": "struct IStakeManager.StakeInfo",
                "name": "factoryInfo",
                "type": "tuple",
            },
            {
                "components": [
                    {"internalType": "uint256", "name": "stake", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "unstakeDelaySec",
                        "type": "uint256",
                    },
                ],
                "internalType": "struct IStakeManager.StakeInfo",
                "name": "paymasterInfo",
                "type": "tuple",
            },
        ],
        "name": "ValidationResult",
        "type": "error",
    },
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "uint256", "name": "preOpGas", "type": "uint256"},
                    {"internalType": "uint256", "name": "prefund", "type": "uint256"},
                    {"internalType": "bool", "name": "sigFailed", "type": "bool"},
                    {"internalType": "uint48", "name": "validAfter", "type": "uint48"},
                    {"internalType": "uint48", "name": "validUntil", "type": "uint48"},
                    {
                        "internalType": "bytes",
                        "name": "paymasterContext",
                        "type": "bytes",
                    },
                ],
                "internalType": "struct IEntryPoint.ReturnInfo",
                "name": "returnInfo",
                "type": "tuple",
            },
            {
                "components": [
                    {"internalType": "uint256", "name": "stake", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "unstakeDelaySec",
                        "type": "uint256",
                    },
                ],
                "internalType": "struct IStakeManager.StakeInfo",
                "name": "senderInfo",
                "type": "tuple",
            },
            {
                "components": [
                    {"internalType": "uint256", "name": "stake", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "unstakeDelaySec",
                        "type": "uint256",
                    },
                ],
                "internalType": "struct IStakeManager.StakeInfo",
                "name": "factoryInfo",
                "type": "tuple",
            },
            {
                "components": [
                    {"internalType": "uint256", "name": "stake", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "unstakeDelaySec",
                        "type": "uint256",
                    },
                ],
                "internalType": "struct IStakeManager.StakeInfo",
                "name": "paymasterInfo",
                "type": "tuple",
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "aggregator",
                        "type": "address",
                    },
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "stake",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "unstakeDelaySec",
                                "type": "uint256",
                            },
                        ],
                        "internalType": "struct IStakeManager.StakeInfo",
                        "name": "stakeInfo",
                        "type": "tuple",
                    },
                ],
                "internalType": "struct IEntryPoint.AggregatorStakeInfo",
                "name": "aggregatorInfo",
                "type": "tuple",
            },
        ],
        "name": "ValidationResultWithAggregation",
        "type": "error",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "bytes32",
                "name": "userOpHash",
                "type": "bytes32",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "sender",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "factory",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "paymaster",
                "type": "address",
            },
        ],
        "name": "AccountDeployed",
        "type": "event",
    },
    {"anonymous": False, "inputs": [], "name": "BeforeExecution", "type": "event"},
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "totalDeposit",
                "type": "uint256",
            },
        ],
        "name": "Deposited",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "aggregator",
                "type": "address",
            }
        ],
        "name": "SignatureAggregatorChanged",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "totalStaked",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "unstakeDelaySec",
                "type": "uint256",
            },
        ],
        "name": "StakeLocked",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "withdrawTime",
                "type": "uint256",
            },
        ],
        "name": "StakeUnlocked",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "withdrawAddress",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256",
            },
        ],
        "name": "StakeWithdrawn",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "bytes32",
                "name": "userOpHash",
                "type": "bytes32",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "sender",
                "type": "address",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "paymaster",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "nonce",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "bool",
                "name": "success",
                "type": "bool",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "actualGasCost",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "actualGasUsed",
                "type": "uint256",
            },
        ],
        "name": "UserOperationEvent",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "bytes32",
                "name": "userOpHash",
                "type": "bytes32",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "sender",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "nonce",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "bytes",
                "name": "revertReason",
                "type": "bytes",
            },
        ],
        "name": "UserOperationRevertReason",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "account",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "withdrawAddress",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256",
            },
        ],
        "name": "Withdrawn",
        "type": "event",
    },
    {
        "inputs": [],
        "name": "SIG_VALIDATION_FAILED",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes", "name": "initCode", "type": "bytes"},
            {"internalType": "address", "name": "sender", "type": "address"},
            {"internalType": "bytes", "name": "paymasterAndData", "type": "bytes"},
        ],
        "name": "_validateSenderAndPaymaster",
        "outputs": [],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint32", "name": "unstakeDelaySec", "type": "uint32"}
        ],
        "name": "addStake",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "depositTo",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "deposits",
        "outputs": [
            {"internalType": "uint112", "name": "deposit", "type": "uint112"},
            {"internalType": "bool", "name": "staked", "type": "bool"},
            {"internalType": "uint112", "name": "stake", "type": "uint112"},
            {"internalType": "uint32", "name": "unstakeDelaySec", "type": "uint32"},
            {"internalType": "uint48", "name": "withdrawTime", "type": "uint48"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "getDepositInfo",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint112", "name": "deposit", "type": "uint112"},
                    {"internalType": "bool", "name": "staked", "type": "bool"},
                    {"internalType": "uint112", "name": "stake", "type": "uint112"},
                    {
                        "internalType": "uint32",
                        "name": "unstakeDelaySec",
                        "type": "uint32",
                    },
                    {
                        "internalType": "uint48",
                        "name": "withdrawTime",
                        "type": "uint48",
                    },
                ],
                "internalType": "struct IStakeManager.DepositInfo",
                "name": "info",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "sender", "type": "address"},
            {"internalType": "uint192", "name": "key", "type": "uint192"},
        ],
        "name": "getNonce",
        "outputs": [{"internalType": "uint256", "name": "nonce", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes", "name": "initCode", "type": "bytes"}],
        "name": "getSenderAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "sender", "type": "address"},
                    {"internalType": "uint256", "name": "nonce", "type": "uint256"},
                    {"internalType": "bytes", "name": "initCode", "type": "bytes"},
                    {"internalType": "bytes", "name": "callData", "type": "bytes"},
                    {
                        "internalType": "uint256",
                        "name": "callGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "verificationGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "preVerificationGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxPriorityFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "bytes",
                        "name": "paymasterAndData",
                        "type": "bytes",
                    },
                    {"internalType": "bytes", "name": "signature", "type": "bytes"},
                ],
                "internalType": "struct UserOperation",
                "name": "userOp",
                "type": "tuple",
            }
        ],
        "name": "getUserOpHash",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "sender",
                                "type": "address",
                            },
                            {
                                "internalType": "uint256",
                                "name": "nonce",
                                "type": "uint256",
                            },
                            {
                                "internalType": "bytes",
                                "name": "initCode",
                                "type": "bytes",
                            },
                            {
                                "internalType": "bytes",
                                "name": "callData",
                                "type": "bytes",
                            },
                            {
                                "internalType": "uint256",
                                "name": "callGasLimit",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "verificationGasLimit",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "preVerificationGas",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "maxFeePerGas",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "maxPriorityFeePerGas",
                                "type": "uint256",
                            },
                            {
                                "internalType": "bytes",
                                "name": "paymasterAndData",
                                "type": "bytes",
                            },
                            {
                                "internalType": "bytes",
                                "name": "signature",
                                "type": "bytes",
                            },
                        ],
                        "internalType": "struct UserOperation[]",
                        "name": "userOps",
                        "type": "tuple[]",
                    },
                    {
                        "internalType": "contract IAggregator",
                        "name": "aggregator",
                        "type": "address",
                    },
                    {"internalType": "bytes", "name": "signature", "type": "bytes"},
                ],
                "internalType": "struct IEntryPoint.UserOpsPerAggregator[]",
                "name": "opsPerAggregator",
                "type": "tuple[]",
            },
            {
                "internalType": "address payable",
                "name": "beneficiary",
                "type": "address",
            },
        ],
        "name": "handleAggregatedOps",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "sender", "type": "address"},
                    {"internalType": "uint256", "name": "nonce", "type": "uint256"},
                    {"internalType": "bytes", "name": "initCode", "type": "bytes"},
                    {"internalType": "bytes", "name": "callData", "type": "bytes"},
                    {
                        "internalType": "uint256",
                        "name": "callGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "verificationGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "preVerificationGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxPriorityFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "bytes",
                        "name": "paymasterAndData",
                        "type": "bytes",
                    },
                    {"internalType": "bytes", "name": "signature", "type": "bytes"},
                ],
                "internalType": "struct UserOperation[]",
                "name": "ops",
                "type": "tuple[]",
            },
            {
                "internalType": "address payable",
                "name": "beneficiary",
                "type": "address",
            },
        ],
        "name": "handleOps",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint192", "name": "key", "type": "uint192"}],
        "name": "incrementNonce",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes", "name": "callData", "type": "bytes"},
            {
                "components": [
                    {
                        "components": [
                            {
                                "internalType": "address",
                                "name": "sender",
                                "type": "address",
                            },
                            {
                                "internalType": "uint256",
                                "name": "nonce",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "callGasLimit",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "verificationGasLimit",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "preVerificationGas",
                                "type": "uint256",
                            },
                            {
                                "internalType": "address",
                                "name": "paymaster",
                                "type": "address",
                            },
                            {
                                "internalType": "uint256",
                                "name": "maxFeePerGas",
                                "type": "uint256",
                            },
                            {
                                "internalType": "uint256",
                                "name": "maxPriorityFeePerGas",
                                "type": "uint256",
                            },
                        ],
                        "internalType": "struct EntryPoint.MemoryUserOp",
                        "name": "mUserOp",
                        "type": "tuple",
                    },
                    {
                        "internalType": "bytes32",
                        "name": "userOpHash",
                        "type": "bytes32",
                    },
                    {"internalType": "uint256", "name": "prefund", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "contextOffset",
                        "type": "uint256",
                    },
                    {"internalType": "uint256", "name": "preOpGas", "type": "uint256"},
                ],
                "internalType": "struct EntryPoint.UserOpInfo",
                "name": "opInfo",
                "type": "tuple",
            },
            {"internalType": "bytes", "name": "context", "type": "bytes"},
        ],
        "name": "innerHandleOp",
        "outputs": [
            {"internalType": "uint256", "name": "actualGasCost", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "", "type": "address"},
            {"internalType": "uint192", "name": "", "type": "uint192"},
        ],
        "name": "nonceSequenceNumber",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "sender", "type": "address"},
                    {"internalType": "uint256", "name": "nonce", "type": "uint256"},
                    {"internalType": "bytes", "name": "initCode", "type": "bytes"},
                    {"internalType": "bytes", "name": "callData", "type": "bytes"},
                    {
                        "internalType": "uint256",
                        "name": "callGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "verificationGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "preVerificationGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxPriorityFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "bytes",
                        "name": "paymasterAndData",
                        "type": "bytes",
                    },
                    {"internalType": "bytes", "name": "signature", "type": "bytes"},
                ],
                "internalType": "struct UserOperation",
                "name": "op",
                "type": "tuple",
            },
            {"internalType": "address", "name": "target", "type": "address"},
            {"internalType": "bytes", "name": "targetCallData", "type": "bytes"},
        ],
        "name": "simulateHandleOp",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "sender", "type": "address"},
                    {"internalType": "uint256", "name": "nonce", "type": "uint256"},
                    {"internalType": "bytes", "name": "initCode", "type": "bytes"},
                    {"internalType": "bytes", "name": "callData", "type": "bytes"},
                    {
                        "internalType": "uint256",
                        "name": "callGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "verificationGasLimit",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "preVerificationGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxPriorityFeePerGas",
                        "type": "uint256",
                    },
                    {
                        "internalType": "bytes",
                        "name": "paymasterAndData",
                        "type": "bytes",
                    },
                    {"internalType": "bytes", "name": "signature", "type": "bytes"},
                ],
                "internalType": "struct UserOperation",
                "name": "userOp",
                "type": "tuple",
            }
        ],
        "name": "simulateValidation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "unlockStake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "withdrawAddress",
                "type": "address",
            }
        ],
        "name": "withdrawStake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "withdrawAddress",
                "type": "address",
            },
            {"internalType": "uint256", "name": "withdrawAmount", "type": "uint256"},
        ],
        "name": "withdrawTo",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {"stateMutability": "payable", "type": "receive"},
]

ACCOUNT_FACTORY_ABI = [
    {
        "inputs": [
            {
                "internalType": "contract IEntryPoint",
                "name": "_entryPoint",
                "type": "address",
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor",
    },
    {
        "inputs": [],
        "name": "accountImplementation",
        "outputs": [
            {"internalType": "contract SimpleAccount", "name": "", "type": "address"}
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "uint256", "name": "salt", "type": "uint256"},
        ],
        "name": "createAccount",
        "outputs": [
            {"internalType": "contract SimpleAccount", "name": "ret", "type": "address"}
        ],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "uint256", "name": "salt", "type": "uint256"},
        ],
        "name": "getAddress",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
]
