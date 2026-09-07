import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => /^\/api\/intake(?:\/|$)/.test(url.pathname) || /^\/(?:order|(?:admin|captain)\/(?:orders|intake))(?:\/|$)/.test(url.pathname),
        handler: "NetworkOnly",
      },
      ...runtimeCaching,
    ],
  },
});

const nextConfig = {
  reactStrictMode: true,
  // Add other Next.js config options here if needed
};

export default withPWA(nextConfig);
