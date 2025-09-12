export function checkKeystorePassword() {
  const password = process.env.KEYSTORE_PASSWORD;
  if (!password) {
    console.error('[AuthUtils] KEYSTORE_PASSWORD environment variable not set.');
    throw new Error('KEYSTORE_PASSWORD environment variable not set.');
  }
  console.log('[AuthUtils] KEYSTORE_PASSWORD is set.');
  return password;
}
