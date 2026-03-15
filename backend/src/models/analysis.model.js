const db = require('../db');

const createAnalysis = async ({ pipelineUrl, organization, project, pipelineId, runName }) => {
  const { rows } = await db.query(
    `INSERT INTO analyses (pipeline_url, organization, project, pipeline_id, run_name, status)
     VALUES ($1, $2, $3, $4, $5, 'processing')
     RETURNING *`,
    [pipelineUrl, organization, project, pipelineId, runName]
  );
  return rows[0];
};

const updateAnalysis = async (id, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const { rows } = await db.query(
    `UPDATE analyses SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0];
};

const saveFailure = async (analysisId, failure) => {
  const { rows } = await db.query(
    `INSERT INTO failures
       (analysis_id, test_name, test_suite, test_file, error_message, error_type,
        stack_trace, screenshot_url, video_url, duration_ms, browser, retry_count, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      analysisId,
      failure.testName,
      failure.testSuite,
      failure.testFile,
      failure.errorMessage,
      failure.errorType,
      failure.stackTrace,
      failure.screenshotUrl,
      failure.videoUrl,
      failure.durationMs,
      failure.browser,
      failure.retryCount,
      failure.tags,
    ]
  );
  return rows[0];
};

const saveSolution = async (failureId, solution) => {
  const { rows } = await db.query(
    `INSERT INTO solutions
       (failure_id, root_cause, solution_steps, code_fix, confidence_score, category, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      failureId,
      solution.rootCause,
      JSON.stringify(solution.solutionSteps),
      solution.codeFix,
      solution.confidenceScore,
      solution.category,
      solution.priority,
    ]
  );
  return rows[0];
};

const getAnalysisById = async (id) => {
  const { rows } = await db.query(`SELECT * FROM analyses WHERE id = $1`, [id]);
  return rows[0] || null;
};

const getAnalysisWithDetails = async (id) => {
  const analysis = await getAnalysisById(id);
  if (!analysis) return null;

  const { rows: failures } = await db.query(
    `SELECT f.*, 
            s.root_cause, s.solution_steps, s.code_fix, s.confidence_score, 
            s.category AS solution_category, s.priority AS solution_priority
     FROM failures f
     LEFT JOIN solutions s ON s.failure_id = f.id
     WHERE f.analysis_id = $1
     ORDER BY s.priority DESC, f.test_name ASC`,
    [id]
  );

  return { ...analysis, failures };
};

const listAnalyses = async (limit = 20, offset = 0) => {
  const { rows } = await db.query(
    `SELECT * FROM analyses ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
};

const deleteAnalysis = async (id) => {
  await db.query(`DELETE FROM analyses WHERE id = $1`, [id]);
};

module.exports = {
  createAnalysis,
  updateAnalysis,
  saveFailure,
  saveSolution,
  getAnalysisById,
  getAnalysisWithDetails,
  listAnalyses,
  deleteAnalysis,
};
