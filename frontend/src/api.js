import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api"
});

api.interceptors.request.use(config => {
  const url = config.url || "";

  const isAdminRequest =
    url.startsWith("/admin/") ||
    url === "/admin" ||
    url.startsWith("/admin-auth/");

  const token = localStorage.getItem(
    isAdminRequest ? "admin_token" : "exam_token"
  );

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;