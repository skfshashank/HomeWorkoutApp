const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

  await page.goto('http://127.0.0.1:8090', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Complete onboarding: select first option at each step, then click Continue
  const onboarding = await page.$eval('#onboarding', el => el.classList.contains('active')).catch(() => false);
  if (onboarding) {
    console.log('Completing onboarding (4 steps)...');
    for (let step = 0; step < 4; step++) {
      // Select first option
      await page.evaluate(() => {
        const opt = document.querySelector('#onb-content .goal-option');
        if (opt) opt.click();
      });
      await new Promise(r => setTimeout(r, 300));
      // Click Continue / Start Training
      await page.evaluate(() => {
        const btn = document.getElementById('onb-next');
        if (btn && !btn.disabled) btn.click();
      });
      await new Promise(r => setTimeout(r, 800));
    }
    await new Promise(r => setTimeout(r, 3000));
    const still = await page.$eval('#onboarding', el => el.classList.contains('active')).catch(() => false);
    console.log('Onboarding still active?', still);
  }

  // Check all page content lengths
  const pages = await page.evaluate(() => {
    const r = {};
    document.querySelectorAll('[data-page]').forEach(el => {
      r[el.dataset.page] = { active: el.classList.contains('active'), len: el.innerHTML.length };
    });
    return r;
  });
  console.log('\nPage states:');
  Object.entries(pages).forEach(([k,v]) => console.log(`  ${k}: active=${v.active} content=${v.len}chars`));

  // Navigate to workouts
  console.log('\n=== Navigate to Workouts ===');
  await page.click('[data-nav="workouts"]');
  await new Promise(r => setTimeout(r, 2000));

  const wk = await page.evaluate(() => {
    const el = document.querySelector('[data-page="workouts"]');
    return {
      active: el.classList.contains('active'),
      len: el.innerHTML.length,
      buttons: [...el.querySelectorAll('.quick-link')].map(b => ({ action: b.dataset.action, text: b.textContent.trim() }))
    };
  });
  console.log('Workouts active:', wk.active, 'content:', wk.len, 'chars');
  console.log('Quick-link buttons:', JSON.stringify(wk.buttons));

  if (wk.buttons.length > 0) {
    // Click Exercise Library
    console.log('\n=== Click Exercise Library ===');
    await page.click('[data-action="open-library"]');
    await new Promise(r => setTimeout(r, 2000));
    const ex = await page.evaluate(() => {
      const el = document.querySelector('[data-page="exercises"]');
      return { active: el.classList.contains('active'), len: el.innerHTML.length, first200: el.innerHTML.substring(0, 200) };
    });
    console.log('Exercises: active=' + ex.active + ' content=' + ex.len + 'chars');
    console.log('Preview:', ex.first200.substring(0, 150));

    // Go back and click Timer Modes
    await page.click('[data-nav="workouts"]');
    await new Promise(r => setTimeout(r, 1000));
    console.log('\n=== Click Timer Modes ===');
    await page.click('[data-action="open-timers"]');
    await new Promise(r => setTimeout(r, 2000));
    const tm = await page.evaluate(() => {
      const el = document.querySelector('[data-page="timers"]');
      return { active: el.classList.contains('active'), len: el.innerHTML.length, first200: el.innerHTML.substring(0, 200) };
    });
    console.log('Timers: active=' + tm.active + ' content=' + tm.len + 'chars');
    console.log('Preview:', tm.first200.substring(0, 150));

    // Go back and click Custom Workout
    await page.click('[data-nav="workouts"]');
    await new Promise(r => setTimeout(r, 1000));
    console.log('\n=== Click Build Custom Workout ===');
    await page.click('[data-action="open-custom"]');
    await new Promise(r => setTimeout(r, 2000));
    const cw = await page.evaluate(() => {
      const el = document.querySelector('[data-page="custom-workouts"]');
      return { active: el.classList.contains('active'), len: el.innerHTML.length, first200: el.innerHTML.substring(0, 200) };
    });
    console.log('Custom Workouts: active=' + cw.active + ' content=' + cw.len + 'chars');
    console.log('Preview:', cw.first200.substring(0, 150));
  }

  console.log('\n--- Console logs ---');
  logs.forEach(l => console.log(l));
  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
