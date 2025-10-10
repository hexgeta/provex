/**
 * Input Validation Utility
 * Centralized validation for all user input amounts
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AmountValidationOptions {
  /**
   * Maximum amount allowed (in human-readable format)
   * Default: "1000000000000" (1 trillion)
   */
  maxAmount?: string;
  
  /**
   * Maximum decimal places allowed
   * Default: 8 (standard for most crypto tokens)
   */
  maxDecimals?: number;
  
  /**
   * Minimum amount allowed (in human-readable format)
   * Default: "0"
   */
  minAmount?: string;
  
  /**
   * Allow zero values
   * Default: false
   */
  allowZero?: boolean;
  
  /**
   * Custom field name for error messages
   * Default: "Amount"
   */
  fieldName?: string;

  /**
   * Maximum balance to check against (optional)
   */
  maxBalance?: string;
}

const DEFAULT_OPTIONS: Required<Omit<AmountValidationOptions, 'maxBalance'>> = {
  maxAmount: "1000000000000", // 1 trillion
  maxDecimals: 8,
  minAmount: "0",
  allowZero: false,
  fieldName: "Amount",
};

/**
 * Removes commas from a number string
 */
export function removeCommas(value: string): string {
  return value.replace(/,/g, '');
}

/**
 * Formats a number string with commas
 */
export function formatNumberWithCommas(value: string): string {
  if (!value) return '';
  
  // Preserve trailing decimal point or zeros while typing
  const hasTrailingDecimal = value.endsWith('.');
  const trailingZeros = value.match(/\.(\d*?)(0+)$/);
  
  const parts = value.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  let formatted = parts.join('.');
  
  // Restore trailing decimal point if it was there
  if (hasTrailingDecimal && !formatted.includes('.')) {
    formatted += '.';
  }
  
  return formatted;
}

/**
 * Validates if a string is a valid number format
 */
export function isValidNumberFormat(value: string): boolean {
  if (!value || value === '') return false;
  
  // Allow empty string, numbers with optional decimal point
  return /^\d*\.?\d*$/.test(value);
}

/**
 * Validates if a string contains only valid number characters (for real-time input validation)
 */
export function isValidNumberInput(value: string, maxDecimals: number = 8): boolean {
  if (value === '') return true;
  
  // Check basic format
  if (!/^\d*\.?\d*$/.test(value)) return false;
  
  // Check decimal places
  const parts = value.split('.');
  if (parts.length > 1 && parts[1].length > maxDecimals) return false;
  
  return true;
}

/**
 * Comprehensive validation for transaction amounts
 */
export function validateAmount(
  value: string | undefined | null,
  options: AmountValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const fieldName = opts.fieldName;

  // Check if value exists
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  // Remove commas for validation
  const cleanValue = removeCommas(value.trim());

  // Check if it's a valid number format
  if (!isValidNumberFormat(cleanValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  // Parse as float for comparisons
  const numValue = parseFloat(cleanValue);

  // Check for NaN
  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  // Check for negative numbers
  if (numValue < 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative`,
    };
  }

  // Check for zero
  if (numValue === 0 && !opts.allowZero) {
    return {
      isValid: false,
      error: `${fieldName} must be greater than zero`,
    };
  }

  // Check minimum amount
  if (numValue < parseFloat(opts.minAmount)) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${formatNumberWithCommas(opts.minAmount)}`,
    };
  }

  // Check maximum amount
  if (numValue > parseFloat(opts.maxAmount)) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${formatNumberWithCommas(opts.maxAmount)}`,
    };
  }

  // Check decimal places
  const decimalParts = cleanValue.split('.');
  if (decimalParts.length > 1) {
    const decimalPlaces = decimalParts[1].length;
    if (decimalPlaces > opts.maxDecimals) {
      return {
        isValid: false,
        error: `${fieldName} can have a maximum of ${opts.maxDecimals} decimal places`,
      };
    }
  }

  // Check against max balance if provided
  if (options.maxBalance !== undefined) {
    const maxBalance = parseFloat(removeCommas(options.maxBalance));
    if (numValue > maxBalance) {
      return {
        isValid: false,
        error: `${fieldName} exceeds available balance of ${formatNumberWithCommas(options.maxBalance)}`,
      };
    }
  }

  // Check for scientific notation or extremely small numbers that could cause issues
  if (cleanValue.includes('e') || cleanValue.includes('E')) {
    return {
      isValid: false,
      error: `${fieldName} format is invalid`,
    };
  }

  // Additional check for numbers that might cause BigInt conversion issues
  // Ensure the number doesn't have too many significant digits
  const significantDigits = cleanValue.replace('.', '').replace(/^0+/, '').length;
  if (significantDigits > 18) { // Safe limit for JavaScript number precision
    return {
      isValid: false,
      error: `${fieldName} is too precise, please reduce the number of digits`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Quick validation for simple cases
 */
export function isValidAmount(value: string | undefined | null): boolean {
  return validateAmount(value).isValid;
}

/**
 * Validates and returns cleaned amount, or null if invalid
 */
export function getValidatedAmount(
  value: string | undefined | null,
  options: AmountValidationOptions = {}
): string | null {
  const result = validateAmount(value, options);
  if (!result.isValid) return null;
  return removeCommas(value!.trim());
}

/**
 * Safe BigInt conversion with validation
 * Converts a decimal amount to mini (8 decimal places) as BigInt
 */
export function amountToBigInt(
  value: string,
  decimals: number = 8
): { success: true; value: bigint } | { success: false; error: string } {
  try {
    const cleanAmount = removeCommas(value.trim());
    
    // Validate first
    const validation = validateAmount(cleanAmount, { maxDecimals: decimals });
    if (!validation.isValid) {
      return { success: false, error: validation.error || 'Invalid amount' };
    }

    // Split into whole and decimal parts
    const [whole = '0', decimal = ''] = cleanAmount.split('.');
    
    // Pad decimal to required length
    const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
    
    // Combine and convert to BigInt
    const combined = whole + paddedDecimal;
    const amountBigInt = BigInt(combined);

    return { success: true, value: amountBigInt };
  } catch (error) {
    return { success: false, error: 'Failed to convert amount' };
  }
}

/**
 * Format amount for display (with commas)
 */
export function formatAmountForDisplay(value: string | number): string {
  const strValue = typeof value === 'number' ? value.toString() : value;
  return formatNumberWithCommas(strValue);
}

/**
 * Sanitize input value for amount fields
 * Use this in onChange handlers to prevent invalid input
 */
export function sanitizeAmountInput(
  value: string,
  maxDecimals: number = 8
): string {
  // Remove commas first
  let clean = removeCommas(value);
  
  // Remove any non-numeric characters except decimal point
  clean = clean.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    clean = parts[0] + '.' + parts[1].slice(0, maxDecimals);
  }
  
  // Remove leading zeros (except for "0." cases)
  if (clean.length > 1 && clean.startsWith('0') && clean[1] !== '.') {
    clean = clean.replace(/^0+/, '');
  }
  
  // If empty after sanitization, return empty string
  if (clean === '' || clean === '.') return clean;
  
  return clean;
}

