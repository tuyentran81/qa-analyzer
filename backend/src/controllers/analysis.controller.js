const { fetchPipelineFailures, parsePipelineUrl } = require('../services/azureDevOps.service');
const { generateSolution } = require('../services/solutionGenerator.service');
const analysisModel = require('../models/analysis.model');

/**
 * POST /api/analyses
 * Accepts a pipeline URL and optional PAT, kicks off analysis
 */
const createAnalysis = async (req, res) => {
  const { pipelineUrl, pat } = req.body;

  if (!pipelineUrl || typeof pipelineUrl !== 'string') {
    return res.status(400).json({ error: 'pipelineUrl is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = parsePipelineUrl(pipelineUrl);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // Create DB record immediately so UI can poll
  let analysis;
  try {
    analysis = await analysisModel.createAnalysis({
      pipelineUrl,
      organization: parsedUrl.org,
      project: parsedUrl.project,
      pipelineId: parsedUrl.buildId,
      runName: `Build #${parsedUrl.buildId}`,
    });
  } catch (dbErr) {
    console.error('DB create error:', dbErr.message);
    return res.status(500).json({ error: 'Failed to create analysis record' });
  }

  // Return immediately, process in background
  res.status(202).json({ id: analysis.id, status: 'processing', message: 'Analysis started' });

  // Background processing
  processAnalysis(analysis.id, pipelineUrl, pat).catch((err) => {
    console.error(`Background analysis ${analysis.id} failed:`, err.message);
  });
};

const processAnalysis = async (analysisId, pipelineUrl, pat) => {
  try {
    const result = await fetchPipelineFailures(pipelineUrl, pat);

    await analysisModel.updateAnalysis(analysisId, {
      run_name: result.runName,
      status: 'processing_results',
      total_tests: result.totalTests,
      failed_tests: result.failedTests,
      passed_tests: result.passedTests,
      skipped_tests: result.skippedTests,
      duration_ms: result.durationMs,
    });

    // Save each failure + generate solution
    for (const failure of result.failures) {
      const savedFailure = await analysisModel.saveFailure(analysisId, failure);
      const solution = generateSolution(failure);
      await analysisModel.saveSolution(savedFailure.id, solution);
    }

    await analysisModel.updateAnalysis(analysisId, { status: 'completed' });
    console.log(`✅ Analysis ${analysisId} completed — ${result.failures.length} failures processed`);
  } catch (err) {
    console.error(`❌ Analysis ${analysisId} error:`, err.message);
    await analysisModel.updateAnalysis(analysisId, {
      status: 'failed',
      run_name: `Error: ${err.message}`,
    }).catch(() => {});
  }
};

/**
 * GET /api/analyses
 */
const listAnalyses = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const analyses = await analysisModel.listAnalyses(limit, offset);
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
};

/**
 * GET /api/analyses/:id
 */
const getAnalysis = async (req, res) => {
  try {
    const analysis = await analysisModel.getAnalysisWithDetails(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};

/**
 * DELETE /api/analyses/:id
 */
const deleteAnalysis = async (req, res) => {
  try {
    const existing = await analysisModel.getAnalysisById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Analysis not found' });
    await analysisModel.deleteAnalysis(req.params.id);
    res.json({ message: 'Analysis deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
};

module.exports = { createAnalysis, listAnalyses, getAnalysis, deleteAnalysis };
