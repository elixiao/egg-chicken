const ERROR = Symbol('egg-error')

class EggError extends Error {
  type // string;
  code // number;
  status // number;
  className // string;
  data // any;
  errors // any;

  constructor(err, name, code, className, _data) {
    let msg = typeof err === 'string' ? err : 'Error'
    const properties = {
      name,
      code,
      status: code,
      className,
      type: 'EggError',
      [ERROR]: err
    }
    if (Array.isArray(_data)) {
      properties.data = _data
    } else if (typeof err === 'object' || _data !== undefined) {
      const {message, errors, ...rest} = typeof err === 'object' ? err : _data
      msg = message || msg
      properties.errors = errors
      properties.data = rest
    }
    super(msg)
    Object.assign(this, properties)
  }

  toJSON() {
    const result = {
      name: this.name,
      message: this.message,
      code: this.code,
      className: this.className,
    }

    if (this.data !== undefined) {
      result.data = this.data
    }

    if (this.errors !== undefined) {
      result.errors = this.errors
    }

    return result
  }
}

// 400 - Bad Request
class BadRequest extends EggError {
  constructor(message, data) {
    super(message, 'BadRequest', 400, 'bad-request', data)
  }
}

// 401 - Not Authenticated
class NotAuthenticated extends EggError {
  constructor(message, data) {
    super(message, 'NotAuthenticated', 401, 'not-authenticated', data)
  }
}

// 402 - Payment Error
class PaymentError extends EggError {
  constructor(message, data) {
    super(message, 'PaymentError', 402, 'payment-error', data)
  }
}

// 403 - Forbidden
class Forbidden extends EggError {
  constructor(message, data) {
    super(message, 'Forbidden', 403, 'forbidden', data)
  }
}

// 404 - Not Found
class NotFound extends EggError {
  constructor(message, data) {
    super(message, 'NotFound', 404, 'not-found', data)
  }
}

// 405 - Method Not Allowed
class MethodNotAllowed extends EggError {
  constructor(message, data) {
    super(message, 'MethodNotAllowed', 405, 'method-not-allowed', data)
  }
}

// 406 - Not Acceptable
class NotAcceptable extends EggError {
  constructor(message, data) {
    super(message, 'NotAcceptable', 406, 'not-acceptable', data)
  }
}

// 408 - Timeout
class Timeout extends EggError {
  constructor(message, data) {
    super(message, 'Timeout', 408, 'timeout', data)
  }
}

// 409 - Conflict
class Conflict extends EggError {
  constructor(message, data) {
    super(message, 'Conflict', 409, 'conflict', data)
  }
}

// 410 - Gone
class Gone extends EggError {
  constructor(message, data) {
    super(message, 'Gone', 410, 'gone', data)
  }
}

// 411 - Length Required
class LengthRequired extends EggError {
  constructor(message, data) {
    super(message, 'LengthRequired', 411, 'length-required', data)
  }
}

// 422 Unprocessable
class Unprocessable extends EggError {
  constructor(message, data) {
    super(message, 'Unprocessable', 422, 'unprocessable', data)
  }
}

// 429 Too Many Requests
class TooManyRequests extends EggError {
  constructor(message, data) {
    super(message, 'TooManyRequests', 429, 'too-many-requests', data)
  }
}

// 500 - General Error
class GeneralError extends EggError {
  constructor(message, data) {
    super(message, 'GeneralError', 500, 'general-error', data)
  }
}

// 501 - Not Implemented
class NotImplemented extends EggError {
  constructor(message, data) {
    super(message, 'NotImplemented', 501, 'not-implemented', data)
  }
}

// 502 - Bad Gateway
class BadGateway extends EggError {
  constructor(message, data) {
    super(message, 'BadGateway', 502, 'bad-gateway', data)
  }
}

// 503 - Unavailable
class Unavailable extends EggError {
  constructor(message, data) {
    super(message, 'Unavailable', 503, 'unavailable', data)
  }
}

module.exports = {
  EggError,
  BadRequest,
  NotAuthenticated,
  PaymentError,
  Forbidden,
  NotFound,
  MethodNotAllowed,
  NotAcceptable,
  Timeout,
  Conflict,
  LengthRequired,
  Unprocessable,
  TooManyRequests,
  GeneralError,
  NotImplemented,
  BadGateway,
  Unavailable,
  400: BadRequest,
  401: NotAuthenticated,
  402: PaymentError,
  403: Forbidden,
  404: NotFound,
  405: MethodNotAllowed,
  406: NotAcceptable,
  408: Timeout,
  409: Conflict,
  410: Gone,
  411: LengthRequired,
  422: Unprocessable,
  429: TooManyRequests,
  500: GeneralError,
  501: NotImplemented,
  502: BadGateway,
  503: Unavailable,
}

