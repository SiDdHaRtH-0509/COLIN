/**
 * COLIN Unified API Client
 * Connects Frontend components, context providers, and pages to Express Backend APIs.
 * Supports cookie-based JWT sessions, Bearer authorization fallback, CSRF protection, and file uploads.
 */

export interface ApiResponseMeta {
  requestId?: string;
  timestamp?: string;
  attribution?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
  meta?: ApiResponseMeta;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'UNKNOWN_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const ACCESS_TOKEN_KEY = 'colin_access_token';
const ADMIN_TOKEN_KEY = 'colin_admin_session_token';
const CSRF_TOKEN_KEY = 'colin_csrf_token';

export const TokenStorage = {
  getAccessToken: (): string | null => {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setAccessToken: (token: string | null): void => {
    try {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } catch {}
  },
  getAdminToken: (): string | null => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setAdminToken: (token: string | null): void => {
    try {
      if (token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
    } catch {}
  },
  getCsrfToken: (): string | null => {
    try {
      // Check document.cookie first if in browser
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
      }
      return localStorage.getItem(CSRF_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setCsrfToken: (token: string | null): void => {
    try {
      if (token) {
        localStorage.setItem(CSRF_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(CSRF_TOKEN_KEY);
      }
    } catch {}
  },
  clearAll: (): void => {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(CSRF_TOKEN_KEY);
    } catch {}
  },
};

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  useAdminAuth?: boolean;
}

const getApiBaseUrl = (): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
    }
  } catch {}
  return '';
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  let url = endpoint;
  if (baseUrl && !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(options.headers || {});

  // Add JSON content type if not uploading FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach token if present
  const token = options.useAdminAuth ? TokenStorage.getAdminToken() : TokenStorage.getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Attach CSRF token if mutating request
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = TokenStorage.getCsrfToken();
    if (csrf && !headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', csrf);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr: any) {
    throw new ApiError(netErr.message || 'Network connection error', 0, 'NETWORK_ERROR');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  let data: any = null;

  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || response.statusText || 'An unexpected error occurred';
    const errorCode = data?.error?.code || data?.code || `HTTP_${response.status}`;
    const details = data?.error?.details || data?.details;
    throw new ApiError(errorMsg, response.status, errorCode, details);
  }

  return data as T;
}

export const apiClient = {
  get: <T = unknown>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> =>
    request<ApiResponse<T>>(url, { ...options, method: 'GET' }),
  post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> =>
    request<ApiResponse<T>>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> =>
    request<ApiResponse<T>>(url, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> =>
    request<ApiResponse<T>>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T = unknown>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> =>
    request<ApiResponse<T>>(url, { ...options, method: 'DELETE' }),
  upload: <T = unknown>(url: string, formData: FormData, options?: RequestOptions): Promise<ApiResponse<T>> =>
    request<ApiResponse<T>>(url, {
      ...options,
      method: 'POST',
      body: formData,
    }),
};
