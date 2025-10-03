import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
console.log("[axios] baseURL =", api.defaults.baseURL);

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
