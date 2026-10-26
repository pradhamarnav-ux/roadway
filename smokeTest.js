async function smokeTest() {
  const BASE_URL = 'http://localhost:5000';

  console.log('=== 1. HEALTH CHECK ===');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log(`Status: ${healthRes.status}`, healthData);

  console.log('\n=== 2. CITIZEN LOGIN ===');
  const citRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'citizen@roadwise.ai', password: 'Citizen@123' }),
  });
  const citData = await citRes.json();
  console.log(`Status: ${citRes.status}, Role: ${citData.user?.role}, Token: ${citData.token?.substring(0, 30)}...`);

  console.log('\n=== 3. ADMIN LOGIN ===');
  const admRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@roadwise.ai', password: 'Admin@123' }),
  });
  const admData = await admRes.json();
  console.log(`Status: ${admRes.status}, Role: ${admData.user?.role}, Token: ${admData.token?.substring(0, 30)}...`);

  console.log('\n=== 4. INSPECTOR LOGIN ===');
  const insRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'inspector@roadwise.ai', password: 'Inspector@123' }),
  });
  const insData = await insRes.json();
  console.log(`Status: ${insRes.status}, Role: ${insData.user?.role}, Token: ${insData.token?.substring(0, 30)}...`);

  console.log('\n=== 5. RBAC 403 TEST: Citizen accessing Admin-Only endpoint ===');
  const citForbiddenRes = await fetch(`${BASE_URL}/api/test/admin-only`, {
    headers: { Authorization: `Bearer ${citData.token}` },
  });
  const citForbiddenData = await citForbiddenRes.json();
  console.log(`HTTP Status: ${citForbiddenRes.status} (Expected: 403 Forbidden)`);
  console.log('Response:', citForbiddenData);

  console.log('\n=== 6. RBAC 200 TEST: Admin accessing Admin-Only endpoint ===');
  const admAllowedRes = await fetch(`${BASE_URL}/api/test/admin-only`, {
    headers: { Authorization: `Bearer ${admData.token}` },
  });
  const admAllowedData = await admAllowedRes.json();
  console.log(`HTTP Status: ${admAllowedRes.status} (Expected: 200 OK)`);
  console.log('Response:', admAllowedData);

  console.log('\n=== 7. RBAC 200 TEST: Inspector accessing Inspector-Only endpoint ===');
  const insAllowedRes = await fetch(`${BASE_URL}/api/test/inspector-only`, {
    headers: { Authorization: `Bearer ${insData.token}` },
  });
  const insAllowedData = await insAllowedRes.json();
  console.log(`HTTP Status: ${insAllowedRes.status} (Expected: 200 OK)`);
  console.log('Response:', insAllowedData);
}

smokeTest().catch(console.error);
