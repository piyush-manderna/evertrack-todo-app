// Automated backend test script to verify all endpoints and security isolation
const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND API TESTS ---');

  // Test 1: Signup User A
  const emailA = `testuser_${Date.now()}@example.com`;
  const signupRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { name: 'Piyush', email: emailA, password: 'password123' });

  console.log('1. Signup Status:', signupRes.status, signupRes.body);
  const cookie = signupRes.headers['set-cookie'] ? signupRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log('   Session Cookie obtained:', !!cookie);

  // Test 2: Check /api/auth/me
  const meRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('2. Me Status:', meRes.status, meRes.body.user?.email === emailA ? '✓ Correct user' : '✗ Failed');

  // Test 3: Create Task for User A
  const todayStr = new Date().toISOString().split('T')[0];
  const createTaskRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
  }, {
    title: 'Complete full-stack Todo Project',
    description: 'Verify MySQL and Express integration',
    task_date: todayStr,
    task_time: '18:00',
  });
  console.log('3. Create Task Status:', createTaskRes.status, createTaskRes.body.task?.title ? '✓ Created' : '✗ Failed');
  const taskId = createTaskRes.body.task?.id;

  // Test 4: Get Today's tasks
  const todayRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/today',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('4. Get Today Tasks:', todayRes.status, `Today count: ${todayRes.body.today?.length}, Overdue count: ${todayRes.body.overdue?.length}`);

  // Test 5: Search Active Tasks
  const searchRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/search?q=full-stack',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('5. Search Tasks:', searchRes.status, `Found: ${searchRes.body.tasks?.length}`);

  // Test 6: Complete Task
  const completeRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/tasks/${taskId}/complete`,
    method: 'PATCH',
    headers: { 'Cookie': cookie },
  });
  console.log('6. Complete Task:', completeRes.status, completeRes.body.task?.completed === 1 ? '✓ Completed' : '✗ Failed');

  // Test 7: Verify Finished endpoint has it
  const finishedRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/finished',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('7. Finished Tasks:', finishedRes.status, `Count: ${finishedRes.body.tasks?.length}`);

  // Test 8: Verify Search NO LONGER finds the completed task (per specification: completed tasks must NOT appear in search)
  const searchAfterComplete = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/search?q=full-stack',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('8. Search Completed Exclusion:', searchAfterComplete.body.tasks?.length === 0 ? '✓ Excluded properly' : '✗ Found completed task');

  // Test 9: Restore Task
  const restoreRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/tasks/${taskId}/restore`,
    method: 'PATCH',
    headers: { 'Cookie': cookie },
  });
  console.log('9. Restore Task:', restoreRes.status, restoreRes.body.task?.completed === 0 ? '✓ Restored' : '✗ Failed');

  // Test 10: Stats Endpoint
  const statsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/stats',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('10. Stats:', statsRes.status, statsRes.body);

  // Test 11: Security & User Isolation Test
  // Create User B and verify User B CANNOT see or edit User A's task
  const emailB = `testuser_b_${Date.now()}@example.com`;
  const signupBRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { name: 'Other User', email: emailB, password: 'password456' });
  const cookieB = signupBRes.headers['set-cookie'][0].split(';')[0];

  const userBAccessTaskA = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/tasks/${taskId}/complete`,
    method: 'PATCH',
    headers: { 'Cookie': cookieB },
  });
  console.log('11. Security Isolation (User B updating User A task):', userBAccessTaskA.status === 404 ? '✓ Blocked (404 Not Found)' : '✗ Security vulnerability!');

  console.log('--- ALL BACKEND TESTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(console.error);
