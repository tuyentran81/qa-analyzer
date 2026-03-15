const axios = require('axios');

/**
 * Parses Azure DevOps pipeline URLs in various formats:
 * - https://dev.azure.com/{org}/{project}/_build/results?buildId={id}
 * - https://{org}.visualstudio.com/{project}/_build/results?buildId={id}
 */
const parsePipelineUrl = (url) => {
  try {
    const parsed = new URL(url);
    let org, project, buildId;

    // dev.azure.com format
    if (parsed.hostname === 'dev.azure.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      org = parts[0];
      project = parts[1];
    }
    // visualstudio.com format
    else if (parsed.hostname.endsWith('.visualstudio.com')) {
      org = parsed.hostname.split('.')[0];
      const parts = parsed.pathname.split('/').filter(Boolean);
      project = parts[0];
    } else {
      throw new Error('Unrecognised Azure DevOps URL format');
    }

    buildId = parsed.searchParams.get('buildId');
    if (!buildId) {
      const match = parsed.pathname.match(/\/(\d+)\/?$/);
      if (match) buildId = match[1];
    }

    if (!org || !project || !buildId) {
      throw new Error('Could not extract org, project, or buildId from URL');
    }

    return { org, project, buildId };
  } catch (err) {
    throw new Error(`Invalid pipeline URL: ${err.message}`);
  }
};

const createAzureClient = (org, pat) => {
  const token = pat || process.env.AZURE_DEVOPS_PAT;
  const baseURL = `https://dev.azure.com/${org}`;
  return axios.create({
    baseURL,
    headers: {
      Authorization: `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
};

const fetchBuildInfo = async (client, project, buildId) => {
  const { data } = await client.get(`/${project}/_apis/build/builds/${buildId}?api-version=7.0`);
  return data;
};

const fetchTestRuns = async (client, project, buildId) => {
  const { data } = await client.get(
    `/${project}/_apis/test/runs?buildId=${buildId}&api-version=7.0`
  );
  return data.value || [];
};

const fetchTestResults = async (client, project, runId) => {
  const { data } = await client.get(
    `/${project}/_apis/test/runs/${runId}/results?outcomes=Failed&$top=200&api-version=7.0`
  );
  return data.value || [];
};

const fetchTestResultDetail = async (client, project, runId, resultId) => {
  try {
    const { data } = await client.get(
      `/${project}/_apis/test/runs/${runId}/results/${resultId}?detailsToInclude=workItems,subResults&api-version=7.0`
    );
    return data;
  } catch {
    return null;
  }
};

const fetchAttachments = async (client, project, runId, resultId) => {
  try {
    const { data } = await client.get(
      `/${project}/_apis/test/runs/${runId}/results/${resultId}/attachments?api-version=7.0`
    );
    return data.value || [];
  } catch {
    return [];
  }
};

/**
 * Main function: fetches all test failures for a pipeline URL
 */
const fetchPipelineFailures = async (pipelineUrl, pat) => {
  const { org, project, buildId } = parsePipelineUrl(pipelineUrl);
  const client = createAzureClient(org, pat);

  // 1. Build metadata
  const build = await fetchBuildInfo(client, project, buildId);

  // 2. Test runs for this build
  const testRuns = await fetchTestRuns(client, project, buildId);

  let allFailures = [];
  let totalTests = 0;
  let failedTests = 0;
  let passedTests = 0;
  let skippedTests = 0;

  for (const run of testRuns) {
    totalTests += run.totalTests || 0;
    failedTests += run.unanalyzedTests || run.failedTests || 0;
    passedTests += run.passedTests || 0;
    skippedTests += run.skippedTests || 0;

    if ((run.unanalyzedTests || run.failedTests || 0) === 0) continue;

    const results = await fetchTestResults(client, project, run.id);

    for (const result of results) {
      const attachments = await fetchAttachments(client, project, run.id, result.id);

      const screenshotAttachment = attachments.find(
        (a) => a.fileName && /\.(png|jpg|jpeg|webp)$/i.test(a.fileName)
      );
      const videoAttachment = attachments.find(
        (a) => a.fileName && /\.(webm|mp4|avi)$/i.test(a.fileName)
      );

      allFailures.push({
        testName: result.testCaseTitle || result.automatedTestName || 'Unknown Test',
        testSuite: result.testSuite?.name || run.name || 'Unknown Suite',
        testFile: result.automatedTestStorage || null,
        errorMessage: result.errorMessage || null,
        errorType: categoriseError(result.errorMessage),
        stackTrace: result.stackTrace || null,
        screenshotUrl: screenshotAttachment?.url || null,
        videoUrl: videoAttachment?.url || null,
        durationMs: result.durationInMs || null,
        browser: extractBrowser(result),
        retryCount: result.failingSince?.failureCount || 0,
        tags: extractTags(result),
      });
    }
  }

  return {
    org,
    project,
    buildId,
    runName: build.buildNumber || `Build #${buildId}`,
    status: build.result || 'unknown',
    totalTests,
    failedTests,
    passedTests,
    skippedTests,
    durationMs: build.finishTime && build.startTime
      ? new Date(build.finishTime) - new Date(build.startTime)
      : null,
    failures: allFailures,
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const categoriseError = (errorMessage) => {
  if (!errorMessage) return 'unknown';
  const msg = errorMessage.toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
  if (msg.includes('element') && (msg.includes('not found') || msg.includes('not visible'))) return 'element_not_found';
  if (msg.includes('expect') || msg.includes('assertion') || msg.includes('tobe') || msg.includes('tohave')) return 'assertion';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('api')) return 'network';
  if (msg.includes('navigation') || msg.includes('page') || msg.includes('url')) return 'navigation';
  if (msg.includes('selector') || msg.includes('locator')) return 'selector';
  if (msg.includes('authentication') || msg.includes('login') || msg.includes('auth')) return 'authentication';
  return 'runtime';
};

const extractBrowser = (result) => {
  const name = (result.automatedTestName || result.testCaseTitle || '').toLowerCase();
  if (name.includes('chromium') || name.includes('chrome')) return 'chromium';
  if (name.includes('firefox')) return 'firefox';
  if (name.includes('webkit') || name.includes('safari')) return 'webkit';
  return 'unknown';
};

const extractTags = (result) => {
  const tags = [];
  if (result.priority) tags.push(`priority:${result.priority}`);
  if (result.area?.name) tags.push(`area:${result.area.name}`);
  return tags;
};

module.exports = { fetchPipelineFailures, parsePipelineUrl };
