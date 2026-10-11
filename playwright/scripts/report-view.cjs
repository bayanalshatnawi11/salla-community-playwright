const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// Read preserved report data and render the existing presentation only.
function renderShareableReport({
  inventory,
  manifest,
  reportResults,
  fixturesByResult,
  input,
  nativeHtml,
  attachmentsOf,
}) {
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  const displayTime = (value) =>
    value
      ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Amman', hour12: false })
      : 'لم يُشغّل';
  const records = inventory.cases.map((item) => ({
    ...item,
    latest: manifest.tests.find((test) => test.automationId === item.automationId),
  }));
  const notExecuted = records
    .filter((item) => !item.latest)
    .map((item) => ({
      sourceId: item.sourceId,
      automationId: item.automationId,
      name: item.name,
      platform: item.platform,
      status: item.status === 'blocked' ? 'blocked' : 'not-run',
      reason: item.blocker ?? 'لم يُشغّل بعد',
    }));
  const counts = manifest.counts;
  const platformRows = [...new Set(inventory.cases.map((item) => item.platform)), 'Overall']
    .map((platform) => {
      const unavailable = notExecuted.filter(
        (item) => platform === 'Overall' || item.platform === platform,
      ).length;
      return `<tr><th>${platform}</th><td>${counts[platform].passed}</td><td>${counts[platform].failed}</td><td>${counts[platform].broken}</td><td>${counts[platform].skipped}</td><td>${unavailable}</td></tr>`;
    })
    .join('');
  const blocker = inventory.sharedBlocker
    ? `<p class="notice">${escape(inventory.sharedBlocker.description)}</p>`
    : '';
  const observation =
    inventory.inspectionFindings
      ?.map(
        (item) =>
          `<p class="notice"><b>ملاحظة من فحص المتصفح:</b> ${escape(item.description)} لم تُسجّل كنتيجة نجاح أو فشل آلي للحالة.</p>`,
      )
      .join('') ?? '';
  // Render saved Allure steps and evidence as ordinary HTML. A data: iframe has
  // an opaque origin and cannot provide the storage used by Allure's app.
  let renderedStepCount = 0;
  const renderStep = (step) => {
    renderedStepCount += 1;
    const status = step.status ?? 'unknown';
    const failure = step.statusDetails?.message
      ? `<pre dir="ltr">${escape(step.statusDetails.message)}</pre>`
      : '';
    const duration = Number.isFinite(step.stop - step.start)
      ? ` · ${step.stop - step.start} ms`
      : '';
    return `<details class="step" data-step-status="${escape(status)}"${status === 'failed' || status === 'broken' ? ' open' : ''}><summary dir="ltr"><span class="${escape(status)}">${escape(status)}</span> · ${escape(step.name)}${duration}</summary>${failure}${(step.steps ?? []).map(renderStep).join('')}</details>`;
  };
  const directEvidenceHashes = new Set();
  const directAttachmentSources = new Set();
  const renderAttachment = (attachment) => {
    const bytes = fs.readFileSync(path.join(input, attachment.source));
    const type = /^[\w.+-]+\/[\w.+-]+$/.test(attachment.type ?? '')
      ? attachment.type
      : 'application/octet-stream';
    const uri = `data:${type};base64,${bytes.toString('base64')}`;
    directEvidenceHashes.add(hash(bytes));
    directAttachmentSources.add(attachment.source);
    const isErrorContext = /error[- ]context/i.test(attachment.name);
    const title = escape(isErrorContext ? 'سياق الفشل — Error context' : attachment.name);
    const explanation = isErrorContext
      ? '<p class="muted">ملف تشخيص من نفس الفشل: يحتوي التحقق الذي فشل، والمتوقع والفعلي، ولقطة نصية للصفحة، ومكان الكود. لا يمثل حالة اختبار إضافية.</p>'
      : '';
    const download = `<a download="${escape(path.basename(attachment.source))}" href="${uri}">تحميل ${title}</a>`;
    let preview = '';
    if (type.startsWith('image/')) preview = `<img src="${uri}" alt="${title}" loading="lazy">`;
    else if (type.startsWith('video/'))
      preview = `<video controls preload="none" aria-label="${title}"><source src="${uri}" type="${type}"></video>`;
    else if (type.startsWith('text/') || type === 'application/json')
      preview = `<details><summary>عرض ${title}</summary><pre dir="ltr">${escape(bytes.toString('utf8'))}</pre></details>`;
    return `<section class="attachment"><h4 dir="ltr">${title}</h4>${explanation}${preview}<p>${download}</p></section>`;
  };
  const executionDetails = new Map();
  for (const item of records) {
    if (!item.latest) continue;
    const result = reportResults.get(item.automationId);
    const fixtures = fixturesByResult.get(result.uuid) ?? [];
    const attachments = [...attachmentsOf(result), ...fixtures.flatMap(attachmentsOf)];
    const uniqueAttachments = [
      ...new Map(attachments.map((attachment) => [attachment.source, attachment])).values(),
    ];
    const noVideo =
      result.status === 'passed' &&
      !uniqueAttachments.some((attachment) => attachment.type?.startsWith('video/'))
        ? '<p class="muted">لا يتوفر فيديو لهذا التنفيذ الناجح؛ الإعداد الحالي يحتفظ بتسجيلات الفشل فقط.</p>'
        : '';
    const failure = result.statusDetails?.message
      ? `<details><summary>سبب الفشل المسجّل</summary><pre dir="ltr">${escape(result.statusDetails.message)}</pre></details>`
      : '';
    executionDetails.set(
      item.automationId,
      `<section class="execution-details"><p><b>السيناريو:</b> ${escape(item.steps)}</p><p><b>النتيجة المتوقعة:</b> ${escape(item.expectedResult)}</p>${failure}<h4>الخطوات الفعلية والتحققات</h4>${(result.steps ?? []).map(renderStep).join('')}${fixtures.length ? `<details><summary>إعداد الاختبار وإنهاؤه</summary>${fixtures.map(renderStep).join('')}</details>` : ''}<h4>الأدلة المتاحة</h4>${noVideo}${uniqueAttachments.map(renderAttachment).join('') || '<p>لا توجد مرفقات لهذا التنفيذ.</p>'}</section>`,
    );
  }
  const statusNames = {
    passed: 'ناجح — Passed',
    failed: 'فشل — Failed',
    broken: 'تعذّر — Broken',
    skipped: 'تخطٍّ — Skipped',
    blocked: 'محجوب — Blocked',
  };
  const field = (name, value) =>
    `<div><dt>${escape(name)}</dt><dd dir="auto">${escape(value ?? 'غير مسجّل')}</dd></div>`;
  const metadataRows = records
    .map((item) => {
      const actual = item.latest;
      const status = actual?.status ?? (item.status === 'blocked' ? 'blocked' : 'not-run');
      const mode =
        actual?.mode === 'headless'
          ? 'دون نافذة — Headless'
          : actual?.mode === 'headed'
            ? 'نافذة ظاهرة — Headed'
            : actual?.mode;
      const metadata = `<dl class="metadata">${field('البيئة', actual?.environment)}${field('المنصة', actual?.platform)}${field('المتصفح', actual?.browser)}${field('الإصدار', actual?.browserVersion)}${field('وضع التشغيل', mode)}${field('Workers الفعلي', actual?.workers)}</dl>`;
      const identity = `<b dir="ltr">${escape(item.name)}</b><span class="case-id" dir="ltr">${escape(item.automationId)}</span><dl class="metadata">${field('Source ID', item.sourceId)}${field('Feature', actual?.feature ?? item.feature)}${field('Story', actual?.story ?? item.story)}${field('Severity', actual?.severity ?? item.severity)}</dl>`;
      const duration =
        actual && Number.isFinite(actual.durationMs)
          ? `${(actual.durationMs / 1000).toFixed(2)} ثانية`
          : 'غير مسجّل';
      const timing = actual
        ? `<dl class="metadata">${field('البداية', displayTime(actual.start))}${field('النهاية', displayTime(actual.stop))}${field('المدة', duration)}</dl>`
        : '<p>لم يُشغّل</p>';
      return `<tr data-case-id="${escape(item.automationId)}" data-status="${escape(status)}"><th scope="row">${identity}</th><td><span class="result-badge ${escape(status)}">${escape(statusNames[status] ?? 'لم يُشغّل')}</span></td><td>${metadata}</td><td>${timing}</td></tr>`;
    })
    .join('');
  const caseRows = records
    .map((item) => {
      const status = item.latest?.status ?? (item.status === 'blocked' ? 'blocked' : 'not-run');
      return `<tr data-result-id="${escape(item.automationId)}"><td dir="ltr">${escape(item.sourceId)}<small>${escape(item.automationId)}</small></td><td dir="ltr">${escape(item.name)}</td><td>${escape(item.platform)}</td><td><span class="result-badge ${escape(status)}">${escape(statusNames[status] ?? 'لم يُشغّل')}</span></td><td dir="ltr">${escape(displayTime(item.latest?.start))}</td></tr>`;
    })
    .join('');
  const executionArticles = records
    .map((item) => {
      const details = executionDetails.get(item.automationId);
      if (!details) return '';
      return `<article data-execution-case="${escape(item.automationId)}"><h3 dir="ltr">${escape(item.automationId)} — ${escape(item.name)}</h3>${details}</article>`;
    })
    .join('');
  const renumbered = manifest.tests.filter(
    (item) => item.executionAutomationId !== item.automationId,
  );
  const identityNotice = renumbered.length
    ? `<p class="muted">أُعيد ترقيم الحالات الحالية حسب طلبك. أرقام التنفيذ الأصلية محفوظة: ${renumbered.map((item) => `<span dir="ltr">${escape(item.executionAutomationId)} → ${escape(item.automationId)}</span>`).join(' · ')}. لم تتغير النتائج أو أوقات التشغيل أو الأدلة.</p>`
    : '';
  const nativeDownload = `<details><summary>نسخة Allure التفاعلية</summary><p>يمكن تنزيلها وفتحها كملف مستقل، دون تضمينها في إطار داخل هذا التقرير.</p><a download="Salla-Community-Allure.html" href="data:text/html;base64,${Buffer.from(nativeHtml).toString('base64')}">تحميل تقرير Allure التفاعلي</a></details>`;
  const template = fs.readFileSync(path.join(__dirname, 'report-template.html'), 'utf8');
  const values = {
    project: escape(inventory.projectName),
    environment: escape(inventory.environment),
    feature: escape(inventory.feature),
    platforms: escape([...new Set(inventory.cases.map((item) => item.platform))].join(' & ')),
    baseURL: escape(inventory.baseURL),
    blocker,
    platformRows,
    caseRows,
    metadataRows,
    identityNotice,
    observation,
    attachmentCount: String(manifest.validatedEmbeddedAttachments),
    sourceRuns: manifest.sourceRuns.map((run) => escape(path.basename(run))).join(' · '),
    executionArticles,
    nativeDownload,
  };
  const html = template.replace(/\{\{(\w+)\}\}/g, (_match, name) => {
    if (!Object.hasOwn(values, name)) throw new Error('Unknown report template field: ' + name);
    return values[name];
  });
  return {
    html,
    notExecuted,
    metadataRowCount: records.length,
    renderedStepCount,
    attachmentCount: directAttachmentSources.size,
    evidenceHashes: directEvidenceHashes,
  };
}

module.exports = { renderShareableReport };
