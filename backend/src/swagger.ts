import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Aimond Token Toolkit API',
      version: '1.0.0',
      description: 'API documentation for the Aimond Token Toolkit backend.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            user_id: {
              type: 'integer',
              description: 'Unique identifier for the user.',
              example: 1,
            },
            wallet_address: {
              type: 'string',
              description: 'The user\'s wallet address.',
              example: "0xC4f9004d8348E9d43c5c080ab0592Fc70c61657f",
            },
            referrer_id: {
              type: 'integer',
              nullable: true,
              description: 'The user_id of the referrer, if any.',
              example: 2,
            },
            total_spending_for_amd_allocation: {
              type: 'string',
              description: 'Total spending amount eligible for AMD allocation.',
              example: "100.50",
            },
            total_spent_money: {
              type: 'string',
              description: 'Total money spent by the user.',
              example: "150.75",
            },
            is_paid_member: {
              type: 'boolean',
              description: 'Indicates if the user is a paid member.',
              example: false,
            },
            paid_member_tier: {
              type: 'integer',
              nullable: true,
              description: 'The tier of the paid member, if applicable.',
              example: 1,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the user was created.',
              example: "2023-10-27T10:00:00Z",
            },
          },
        },
        Allocation: {
          type: 'object',
          properties: {
            allocation_id: {
              type: 'integer',
              description: 'Unique identifier for the allocation.',
              example: 1,
            },
            user_id: {
              type: 'integer',
              description: 'The user_id to whom the allocation belongs.',
              example: 1,
            },
            type: {
              type: 'string',
              enum: ['SPENDING_REWARD', 'REFERRAL_REWARD', 'AIRDROP'],
              description: 'The type of allocation.',
              example: "SPENDING_REWARD",
            },
            amount: {
              type: 'string',
              description: 'The amount of the allocation.',
              example: "10000",
            },
            is_claimed: {
              type: 'boolean',
              description: 'Indicates if the allocation has been claimed.',
              example: false,
            },
            source_info: {
              type: 'string',
              nullable: true,
              description: 'Additional information about the source of the allocation.',
              example: "AMD allocation for 10.5 spending",
            },
            claim_id: {
              type: 'integer',
              nullable: true,
              description: 'The claim_id if this allocation is part of a claim.',
              example: null,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the allocation was created.',
              example: "2023-10-27T10:00:00Z",
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
