import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig = {
  reactStrictMode: true,
  // Add other Next.js config options here if needed
};

export default withPWA(nextConfig);
