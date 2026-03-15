const { pool } = require('./index');
require('dotenv').config();

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Analyses table - stores each pipeline analysis run
    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pipeline_url TEXT NOT NULL,
        organization TEXT,
        project TEXT,
        pipeline_id TEXT,
        run_id TEXT,
        run_name TEXT,
        status TEXT DEFAULT 'pending',
        total_tests INTEGER DEFAULT 0,
        failed_tests INTEGER DEFAULT 0,
        passed_tests INTEGER DEFAULT 0,
        skipped_tests INTEGER DEFAULT 0,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Failures table - individual test failures
    await client.query(`
      CREATE TABLE IF NOT EXISTS failures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
        test_name TEXT NOT NULL,
        test_suite TEXT,
        test_file TEXT,
        error_message TEXT,
        error_type TEXT,
        stack_trace TEXT,
        screenshot_url TEXT,
        video_url TEXT,
        duration_ms INTEGER,
        browser TEXT,
        retry_count INTEGER DEFAULT 0,
        tags TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Solutions table - AI-generated fix suggestions
    await client.query(`
      CREATE TABLE IF NOT EXISTS solutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        failure_id UUID REFERENCES failures(id) ON DELETE CASCADE,
        root_cause TEXT,
        solution_steps JSONB,
        code_fix TEXT,
        confidence_score NUMERIC(3,2),
        category TEXT,
        priority TEXT DEFAULT 'medium',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_failures_analysis_id ON failures(analysis_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_solutions_failure_id ON solutions(failure_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC)`);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(console.error);
