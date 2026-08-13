const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function extractConstValue(source, constName) {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`);
  const match = source.match(pattern);
  return match?.[1] || '';
}

function loadMobileSupabaseConfig() {
  const configPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'data',
    'datasources',
    'supabase',
    'supabase.ts'
  );

  try {
    const source = fs.readFileSync(configPath, 'utf8');
    return {
      url: extractConstValue(source, 'SUPABASE_URL'),
      anonKey: extractConstValue(source, 'SUPABASE_ANON_KEY'),
    };
  } catch {
    return { url: '', anonKey: '' };
  }
}

function getSupabaseConfig() {
  const mobileConfig = loadMobileSupabaseConfig();
  return {
    url: process.env.SUPABASE_URL || mobileConfig.url,
    anonKey: process.env.SUPABASE_ANON_KEY || mobileConfig.anonKey,
  };
}

function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    const err = new Error('SUPABASE_URL và SUPABASE_ANON_KEY chưa được cấu hình cho backend hoặc mobile Supabase client.');
    err.status = 500;
    throw err;
  }
  return config;
}

function createAnonClient() {
  const config = assertSupabaseConfig();
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createUserClient(accessToken) {
  const config = assertSupabaseConfig();
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

module.exports = {
  createAnonClient,
  createUserClient,
};
