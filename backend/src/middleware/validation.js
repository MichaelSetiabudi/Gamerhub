const Joi = require('joi');

// User validation schemas
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens'
    }),
  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .min(6)
    .required()
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .required()
});

const updateProfileSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_-]+$/),
  avatar: Joi.string().uri(),
  customStatus: Joi.string().max(100),
  favoriteGames: Joi.array().items(Joi.string()),
  gamerTags: Joi.object({
    steam: Joi.string().allow(''),
    discord: Joi.string().allow(''),
    battlenet: Joi.string().allow(''),
    epic: Joi.string().allow('')
  }),
  theme: Joi.string().valid('dark', 'light', 'auto'),
  notifications: Joi.object({
    mentions: Joi.boolean(),
    directMessages: Joi.boolean(),
    channelMessages: Joi.boolean()
  })
});

// Channel validation schemas
const createChannelSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Channel name can only contain letters, numbers, underscores, and hyphens'
    }),
  displayName: Joi.string()
    .max(100)
    .required(),
  description: Joi.string()
    .max(500)
    .allow(''),
  type: Joi.string()
    .valid('public', 'private')
    .default('public'),
  category: Joi.string()
    .valid('general', 'gaming', 'valorant', 'genshin-impact', 'minecraft', 'league-of-legends', 'dota2', 'csgo', 'fortnite', 'apex-legends', 'other')
    .default('general'),
  game: Joi.string()
    .max(100)
    .allow(''),
  icon: Joi.string()
    .max(10)
    .default('🎮'),
  isInviteOnly: Joi.boolean()
    .default(false)
});

const updateChannelSchema = Joi.object({
  displayName: Joi.string().max(100),
  description: Joi.string().max(500).allow(''),
  category: Joi.string().valid('general', 'gaming', 'valorant', 'genshin-impact', 'minecraft', 'league-of-legends', 'dota2', 'csgo', 'fortnite', 'apex-legends', 'other'),
  game: Joi.string().max(100).allow(''),
  icon: Joi.string().max(10),
  slowMode: Joi.number().min(0).max(21600),
  isNSFW: Joi.boolean(),
  isInviteOnly: Joi.boolean()
});

// Message validation schemas
const sendMessageSchema = Joi.object({
  content: Joi.string()
    .max(2000)
    .required(),
  type: Joi.string()
    .valid('text', 'image', 'file')
    .default('text'),
  replyTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId pattern
    .allow(null)
});

const editMessageSchema = Joi.object({
  content: Joi.string()
    .max(2000)
    .required()
});

// Validation middleware function
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};

// Query validation for pagination
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt').default('-createdAt')
});

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors
      });
    }
    
    req.query = value;
    next();
  };
};

module.exports = {
  // User schemas
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  
  // Channel schemas
  validateCreateChannel: validate(createChannelSchema),
  validateUpdateChannel: validate(updateChannelSchema),
  
  // Message schemas
  validateSendMessage: validate(sendMessageSchema),
  validateEditMessage: validate(editMessageSchema),
  
  // Query validation
  validatePagination: validateQuery(paginationSchema),
  
  // Generic validation
  validate,
  validateQuery
};
