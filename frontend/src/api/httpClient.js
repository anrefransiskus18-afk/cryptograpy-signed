import axios from "axios";
import { attachInterceptors } from "./interceptors";

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
export const DEFAULT_TIMEOUT_MS = 30000;
export const LONG_OPERATION_TIMEOUT_MS = 5 * 60 * 1000;

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true
});

attachInterceptors(httpClient);

export default httpClient;
