const path = require('path');

// Resolve project root. Prefer APP_ROOT if absolute; otherwise derive from this file location
const derivedProjectRoot = path.join(__dirname, '..', '..');
const envAppRoot = process.env.APP_ROOT;
const projectRoot = envAppRoot && path.isAbsolute(envAppRoot)
  ? envAppRoot
  : derivedProjectRoot;

// Resolve directories. Allow absolute overrides via env; otherwise resolve relative to project root
function resolveDir(envVarName, defaultRelative) {
  const envValue = process.env[envVarName];
  if (envValue && path.isAbsolute(envValue)) {
    return envValue;
  }
  const relative = envValue || defaultRelative;
  return path.join(projectRoot, relative);
}

const paths = {
  projectRoot,
  publicDir: path.join(projectRoot, 'client', 'public'),
  viewsDir: path.join(projectRoot, 'client', 'views'),
  uploadsDir: resolveDir('UPLOAD_DIR', 'uploads'),
  generatedDir: resolveDir('GENERATED_DIR', 'generated'),
};

module.exports = { paths };

