import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.google.com https://*.googleapis.com https://apis.google.com;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              connect-src 'self' https://*.google.com https://*.googleapis.com https://www.gstatic.com https://*.googlevideo.com https://csp.withgoogle.com https://*.slack.com;
              frame-src 'self' https://*.google.com;
              img-src 'self' data: https://*.google.com https://*.googleapis.com;
              font-src 'self' https://fonts.gstatic.com;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ];
  }
};

export default nextConfig;
