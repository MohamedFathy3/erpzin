import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_URL || "https://testapi.injazyemen.cloud";

  return {
    server: {
      host: "::",
      port: 7000,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, "/api"),
          configure: (proxy) => {
            proxy.on("error", (err) => console.log("proxy error", err));
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log("Sending Request to the Target:", req.method, req.url);
              proxyReq.setHeader("X-Requested-With", "XMLHttpRequest");
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
            });
          },
        },
        "/sanctum": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    preview: {
      host: "::",
      port: 7000,
      allowedHosts: ["professionalacademyedu.com", "localhost", "127.0.0.1", "::1", ".professionalacademyedu.com", "injazyemen.cloud", ".injazyemen.cloud"],
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
