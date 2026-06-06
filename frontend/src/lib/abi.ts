export const SUBSCRIPTION_MANAGER_ABI = [
  // Plan Management
  {
    name: "createPlan",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "price", type: "uint256" },
      { name: "interval", type: "uint256" },
    ],
    outputs: [{ name: "planId", type: "uint256" }],
  },
  {
    name: "pausePlan",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "planId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "resumePlan",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "planId", type: "uint256" }],
    outputs: [],
  },
  // Subscription Management
  {
    name: "subscribe",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "planId", type: "uint256" }],
    outputs: [{ name: "subId", type: "uint256" }],
  },
  {
    name: "cancel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "subId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "charge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "subId", type: "uint256" }],
    outputs: [],
  },
  // Views
  {
    name: "getMerchantPlans",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "merchant", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "merchant", type: "address" },
          { name: "name", type: "string" },
          { name: "price", type: "uint256" },
          { name: "interval", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getSubscriberSubs",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "subscriber", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "planId", type: "uint256" },
          { name: "subscriber", type: "address" },
          { name: "startedAt", type: "uint256" },
          { name: "nextChargeAt", type: "uint256" },
          { name: "totalPaid", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getChargeable",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "fromId", type: "uint256" },
      { name: "toId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "nextPlanId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "nextSubId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "plans",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "planId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "merchant", type: "address" },
      { name: "name", type: "string" },
      { name: "price", type: "uint256" },
      { name: "interval", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  // Events
  {
    name: "PlanCreated",
    type: "event",
    inputs: [
      { name: "planId", type: "uint256", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "price", type: "uint256", indexed: false },
      { name: "interval", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Subscribed",
    type: "event",
    inputs: [
      { name: "subId", type: "uint256", indexed: true },
      { name: "planId", type: "uint256", indexed: true },
      { name: "subscriber", type: "address", indexed: true },
    ],
  },
  {
    name: "Charged",
    type: "event",
    inputs: [
      { name: "subId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Cancelled",
    type: "event",
    inputs: [
      { name: "subId", type: "uint256", indexed: true },
    ],
  },

{
    name: "setProfile",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "avatarUrl", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "getProfile",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "merchant", type: "address" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "avatarUrl", type: "string" },
    ],
  },



] as const;

export const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },

{
    name: "subscriptions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "subId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "planId", type: "uint256" },
      { name: "subscriber", type: "address" },
      { name: "startedAt", type: "uint256" },
      { name: "nextChargeAt", type: "uint256" },
      { name: "totalPaid", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },


] as const;
