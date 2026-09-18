import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createPreview, validateTarget } from './proxy.mjs';

process.env.RETICLE_TELEMETRY = '0';
process.env.DO_NOT_TRACK = '1';
// An explicit state directory suppresses upstream's cross-editor approval migration.
process.env.RETICLE_STATE_DIR ||= join(homedir(), '.reticle');
const require = createRequire(import.meta.url);
const [command, ...args] = process.argv.slice(2);
if (command === 'preview') {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--upstream', '--port'].includes(args[i]) || !args[i + 1]) throw new Error('Use preview --upstream URL --port PORT');
    options[args[i]] = args[i + 1];
  }
  const target = validateTarget(options['--upstream']);
  const port = Number(options['--port']);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === Number(target.port)) throw new Error('Choose a distinct preview port between 1024 and 65535.');
  const { build } = await import('esbuild');
  const bundle = await build({ stdin: { contents:
    "import {reticle,SESSION_AUTO} from '@reticlehq/browser'; reticle.connect({...window.__reticleLocalOptions,session:SESSION_AUTO,captureNetworkBodies:false,captureErrorBodies:false,sourceMapping:false,overlay:false,present:false,annotate:false}); delete window.__reticleLocalOptions;",
    resolveDir: dirname(fileURLToPath(import.meta.url)) },
    bundle: true, write: false, platform: 'browser', format: 'iife', minify: true,
    define: { 'process.env.NODE_ENV': '"development"' } });
  const server = createPreview({ upstream: target.href, sdk: () => {
    const token = readFileSync(join(process.env.RETICLE_PAIRING_TOKEN_DIR || join(homedir(), '.reticle'), 'pairing-token'), 'utf8').trim();
    if (!token) throw new Error('Missing pairing token');
    return `window.__reticleLocalOptions=${JSON.stringify({ url: `ws://127.0.0.1:${port}/__reticle_local__/bridge`, token })};\n${bundle.outputFiles[0].text}`;
  }});
  server.listen(port, '127.0.0.1', () => console.log(`Reticle preview http://127.0.0.1:${port} -> ${target.origin}; stop with Ctrl+C`));
} else if (['mcp', 'serve', 'status', 'verify'].includes(command)) {
  const serverEntry = join(dirname(require.resolve('@reticlehq/server')), '..', 'bin', 'reticle.js');
  const child = spawn(process.execPath, [serverEntry, command, ...args], { stdio: 'inherit', env: process.env });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} else {
  console.error('Usage: node dev/reticle/run.mjs preview --upstream http://127.0.0.1:APP_PORT --port PREVIEW_PORT | mcp | serve | status | verify ...');
  process.exitCode = 1;
}
