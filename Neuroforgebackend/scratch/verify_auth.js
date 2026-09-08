const URL = 'http://localhost:8080';

async function getJwtToken(email, password) {
  try {
    const res = await fetch(`${URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data.token;
  } catch (err) {
    return null;
  }
}

async function run() {
  const adminToken = await getJwtToken('admin@neuroforce.com', 'NeuroForgeAdmin2026!');
  
  // 1. Fetch projects
  const projectsRes = await fetch(`${URL}/api/projects`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const projects = await projectsRes.json();
  const projA = projects[0];
  const projB = projects[1];

  const usersRes = await fetch(`${URL}/api/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const users = await usersRes.json();

  const developer = users.find(u => u.role === 'DEVELOPER');
  const tester = users.find(u => u.role === 'TESTER');
  const manager = users.find(u => u.role === 'PROJECT_MANAGER');
  const admin = users.find(u => u.role === 'ADMIN');

  // Helper to create team
  async function createTeam(teamName, projectId) {
    const res = await fetch(`${URL}/api/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ teamName, projectId })
    });
    return await res.json();
  }

  // Create temporary teams dynamically
  console.log("Creating temporary teams for Project A and Project B...");
  const teamA1 = await createTeam("Temp Team A1", projA.projectId);
  const teamA2 = await createTeam("Temp Team A2", projA.projectId);
  const teamB = await createTeam("Temp Team B", projB.projectId);

  console.log(`Created Team A1 ID=${teamA1.teamId} in Project A (ID=${projA.projectId})`);
  console.log(`Created Team A2 ID=${teamA2.teamId} in Project A (ID=${projA.projectId})`);
  console.log(`Created Team B ID=${teamB.teamId} in Project B (ID=${projB.projectId})`);

  // Helper to post team member
  async function assign(userId, teamId, roleInTeam) {
    const res = await fetch(`${URL}/api/team-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ userId, teamId, roleInTeam })
    });
    return { status: res.status, data: res.status === 200 || res.status === 201 ? await res.json() : null };
  }

  // Helper to delete team member
  async function removeMember(memberId) {
    await fetch(`${URL}/api/team-members/${memberId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  }

  // Helper to delete team
  async function removeTeam(teamId) {
    await fetch(`${URL}/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  }

  const membersToCleanup = [];

  async function testCase(label, userId, teamId, expectedCode) {
    const result = await assign(userId, teamId, "MEMBER");
    const passed = (result.status === expectedCode || (expectedCode === 200 && result.status === 201));
    console.log(`| ${label} | Team ID: ${teamId} | Expected: ${expectedCode} | Actual: ${result.status} | ${passed ? '✅ PASS' : '❌ FAIL'} |`);
    if (result.data && result.data.memberId) {
      membersToCleanup.push(result.data.memberId);
    }
  }

  console.log("\n| Test Case | Destination Team | Expected Code | Actual Code | Result |");
  console.log("|---|---|---|---|---|");

  // 1. Developer -> Project A -> allowed (200/201)
  await testCase("Developer -> Project A (Team A1)", developer.userId, teamA1.teamId, 200);

  // 2. Developer -> another team in Project A -> allowed (200/201)
  await testCase("Developer -> another team in Project A (Team A2)", developer.userId, teamA2.teamId, 200);

  // 3. Developer -> Project B -> rejected 400
  await testCase("Developer -> Project B (Team B)", developer.userId, teamB.teamId, 400);

  // 4. Tester -> Project A -> allowed (200/201)
  await testCase("Tester -> Project A (Team A1)", tester.userId, teamA1.teamId, 200);

  // 5. Tester -> Project B -> rejected 400
  await testCase("Tester -> Project B (Team B)", tester.userId, teamB.teamId, 400);

  // 6. Project Manager -> Project A -> allowed (200/201)
  await testCase("Project Manager -> Project A (Team A1)", manager.userId, teamA1.teamId, 200);

  // 7. Project Manager -> Project B -> rejected 400
  await testCase("Project Manager -> Project B (Team B)", manager.userId, teamB.teamId, 400);

  // 8. Admin -> Project A -> allowed (200/201)
  await testCase("Admin -> Project A (Team A1)", admin.userId, teamA1.teamId, 200);

  // 9. Admin -> Project B -> allowed (200/201)
  await testCase("Admin -> Project B (Team B)", admin.userId, teamB.teamId, 200);

  // Clean up
  console.log("\nCleaning up created team member records...");
  for (const id of membersToCleanup) {
    await removeMember(id);
  }

  console.log("Cleaning up temporary teams...");
  await removeTeam(teamA1.teamId);
  await removeTeam(teamA2.teamId);
  await removeTeam(teamB.teamId);

  console.log("Cleanup complete!");
}

run();
