import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation error handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
      })),
    });
    return;
  }

  next();
};

// User validation rules
export const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .escape(),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Incident validation
export const validateIncident = [
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Location is required'),
  body('type')
    .isIn(['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Environmental', 'Property Damage'])
    .withMessage('Invalid incident type'),
  body('severity')
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid severity level'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  handleValidationErrors,
];

// Inspection validation
export const validateInspection = [
  body('templateName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Template name is required'),
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title is required'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Location is required'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one inspection item is required'),
  handleValidationErrors,
];

// Permit validation
export const validatePermit = [
  body('type')
    .isIn(['Hot Work', 'Cold Work', 'Working at Height', 'Confined Space', 'Electrical Isolation', 'Excavation', 'Lifting Operation'])
    .withMessage('Invalid permit type'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Location is required'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('validFrom')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('validUntil')
    .isISO8601()
    .withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  handleValidationErrors,
];

// UUID validation for route parameters
export const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  handleValidationErrors,
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};
