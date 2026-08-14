const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const readline = require('readline');
const pino = require('pino');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('أدخل رقم هاتفك مع رمز الدولة (مثال 967xxxxxxxxx): ');
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`\n🔑 رمز الاقتران الخاص بك هو: ${code}\n`);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح بالواتساب!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const from = msg.key.remoteJid;
            await sock.sendMessage(from, { text: 'ارررحب انتظر حتى يرد عليك عبوود وتحياتي' });
        }
    });
}

connectToWhatsApp();
