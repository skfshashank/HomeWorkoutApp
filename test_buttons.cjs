const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Collect console messages and errors
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

  await page.goto('http://127.0.0.1:8090', { waitUntil: 'networkidle0', timeout: 15000 });
  
  // Wait for app to init
  await page.waitForSelector('[data-page="dashboard"].active', { timeout: 10000 }).catch(() => {
    logs.push('[TEST] Dashboard never became active');
  });

  // Check if onboarding is showing
  const onboarding = await page.$eval('#onboarding', el => el.classList.contains('active')).catch(() => false);
  console.log('Onboarding active:', onboarding);

  if (onboarding) {
    // Complete onboarding quickly
    console.log('Need to complete onboarding first...');
    // Try clicking through onboarding
    const onbContent = await page.$eval('#onb-content', el => el.innerHTML.substring(0, 200));
    console.log('Onboarding content:', onbContent);
    
    // Fill onboarding form
    await page.evaluate(() => {
      // Find any visible buttons in onboarding and click them
      const btns = document.querySelectorAll('#onboarding button, #onb-content button, #onb-footer button');
      console.log('Onboarding buttons:', btns.length);
      btns.forEach(b => console.log('  btn:', b.textContent.trim(), b.dataset));
    });
    await browser.close();
    console.log('\n--- Console logs ---');
    logs.forEach(l => console.log(l));
    return;
  }

  // Navigate to workouts page
  console.log('\n=== Navigating to Workouts ===');
  await page.click('[data-nav="workouts"]');
  await new Promise(r => setTimeout(r, 1000));

  const workoutsActive = await page.$eval('[data-page="workouts"]', el => ({
    active: el.classList.contains('active'),
    display: getComputedStyle(el).display,
    contentLen: el.innerHTML.length,
    hasButtons: el.querySelectorAll('[data-action="open-library"], [data-action="open-custom"], [data-action="open-timers"]').length
  }));
  console.log('Workouts page:', JSON.stringify(workoutsActive));

  // Check what views exist
  const viewsState = await page.evaluate(() => {
    const pages = ['exercises', 'custom-workouts', 'timers'];
    return pages.map(p => {
      const el = document.querySelector(`[data-page="${p}"]`);
      return {
        page: p,
        exists: !!el,
        hidden: el?.hidden,
        display: el ? getComputedStyle(el).display : null,
        contentLen: el?.innerHTML?.length || 0,
        content: el?.innerHTML?.substring(0, 100) || ''
      };
    });
  });
  console.log('\nTarget pages before click:');
  viewsState.forEach(v => console.log(`  ${v.page}: exists=${v.exists} hidden=${v.hidden} display=${v.display} content=${v.contentLen}chars "${v.content}"`));

  // Click Exercise Library button
  console.log('\n=== Clicking Exercise Library ===');
  const libBtn = await page.$('[data-action="open-library"]');
  if (!libBtn) {
    console.log('ERROR: Exercise Library button not found!');
  } else {
    await libBtn.click();
    await new Promise(r => setTimeout(r, 2000));

    const afterClick = await page.evaluate(() => {
      const pages = ['workouts', 'exercises', 'custom-workouts', 'timers'];
      return pages.map(p => {
        const el = document.querySelector(`[data-page="${p}"]`);
        return {
          page: p,
          active: el?.classList.contains('active'),
          hidden: el?.hidden,
          display: el ? getComputedStyle(el).display : null,
          contentLen: el?.innerHTML?.length || 0,
          content: el?.innerHTML?.substring(0, 200) || ''
        };
      });
    });
    console.log('\nAll pages after clicking Exercise Library:');
    afterClick.forEach(v => console.log(`  ${v.page}: active=${v.active} hidden=${v.hidden} display=${v.display} content=${v.contentLen}chars`));
    
    const exercisesPage = afterClick.find(v => v.page === 'exercises');
    console.log('\nExercises page content preview:', exercisesPage?.content);
  }

  // Go back to workouts and try Timer Modes
  console.log('\n=== Clicking back to Workouts then Timer Modes ===');
  await page.click('[data-nav="workouts"]');
  await new Promise(r => setTimeout(r, 500));
  
  const timerBtn = await page.$('[data-action="open-timers"]');
  if (timerBtn) {
    await timerBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    const timerState = await page.$eval('[data-page="timers"]', el => ({
      active: el.classList.contains('active'),
      display: getComputedStyle(el).display,
      contentLen: el.innerHTML.length,
      content: el.innerHTML.substring(0, 200)
    }));
    console.log('Timer page after click:', JSON.stringify(timerState));
  }

  console.log('\n--- Console logs ---');
  logs.forEach(l => console.log(l));

  await browser.close();
})().catch(e => { console.error('Test failed:', e.message); process.exit(1); });
