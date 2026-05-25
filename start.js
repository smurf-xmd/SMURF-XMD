const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE = path.join(__dirname, '.env');

function readEnv() {
    if (!fs.existsSync(ENV_FILE)) return {};
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
    const env = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = val;
    }
    return env;
}

function writeEnvKey(key, value) {
    let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content = content.trimEnd() + `\n${key}=${value}\n`;
    }
    fs.writeFileSync(ENV_FILE, content, 'utf8');
    process.env[key] = value;
}

function getSessionId() {
    if (process.env.SESSION_ID && process.env.SESSION_ID.trim()) return process.env.SESSION_ID.trim();
    const fileEnv = readEnv();
    if (fileEnv.SESSION_ID && fileEnv.SESSION_ID.trim()) return fileEnv.SESSION_ID.trim();
    return null;
}

(async () => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║       𝐒𝐌𝐔𝐑𝐅 𝐗𝐌𝐃  —  Startup Wizard        ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    let sessionId = getSessionId();

    if (sessionId) {
        const source = process.env.SESSION_ID ? 'Panel Environment Variables' : '.env file';
        console.log(`✅  SESSION_ID detected from: ${source}`);
        console.log('🚀  Starting bot...\n');
    } else {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        const ask = (q) => new Promise(res => rl.question(q, ans => res(ans.trim())));

        console.log('⚠️   No SESSION_ID found!\n');
        console.log('📌  Get your session ID from the pairing server.');
        console.log('    Format: Gifted~XXXXXXXX\n');

        let id = '';
        while (!id) {
            id = await ask('🔑  Enter SESSION_ID: ');
            if (!id) console.log('❌  Cannot be empty. Try again.\n');
        }

        const mode = await ask('   MODE [public/private] (default: public): ') || 'public';
        const tz = await ask('   TIME_ZONE (default: Africa/Nairobi): ') || 'Africa/Nairobi';
        const autoRead = await ask('   AUTO_READ_STATUS [true/false] (default: true): ') || 'true';
        const autoLike = await ask('   AUTO_LIKE_STATUS [true/false] (default: true): ') || 'true';
        rl.close();

        writeEnvKey('SESSION_ID', id);
        writeEnvKey('MODE', mode);
        writeEnvKey('TIME_ZONE', tz);
        writeEnvKey('AUTO_READ_STATUS', autoRead);
        writeEnvKey('AUTO_LIKE_STATUS', autoLike);

        console.log('\n✅  Settings saved to .env');
        console.log('🚀  Starting bot...\n');
    }

    require('./index.js');
})();
