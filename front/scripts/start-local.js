#!/usr/bin/env node
const { networkInterfaces } = require('os');
const { spawn } = require('child_process');

function getLocalIPv4() {
  const nets = networkInterfaces();
  const entries = Object.entries(nets)
    .filter(([name]) => !/wsl|docker|virtual|vethernet|loopback/i.test(name))
    .flatMap(([name, addresses]) => (addresses || []).map((address) => ({ name, address })));

  for (const { address } of entries) {
    const net = address;
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
  }
  return null;
}

const ip = getLocalIPv4();
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://nexdose-backend.onrender.com';

if (ip) {
  console.log(`Using packager host: ${ip}`);
}
console.log(`Using API base URL: ${apiBaseUrl}`);

const env = Object.assign({}, process.env, {
  ...(ip ? { EXPO_PACKAGER_HOSTNAME: ip } : {}),
  EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
});

const proc = spawn('npx', ['expo', 'start', '--lan'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

proc.on('exit', (code) => process.exit(code));
proc.on('error', (err) => {
  console.error('Failed to start Expo:', err);
  process.exit(1);
});
