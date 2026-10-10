require('dotenv').config()

const pino = require('pino')
const readline = require('readline')
const qrcode = require('qrcode-terminal')

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('baileys')

const { Boom } = require('@hapi/boom')

// ============================================================
// LOCAL MODULES
// ============================================================

const db = require('./lib/database')
const { loadPlugins } = require('./lib/pluginLoader')
const { handleAirbotGroupMessage } = require('./lib/airbotBridge')
const { jidPhone, getText, getQuotedMessage } = require('./lib/utils')
const { startVotingScheduler } = require('./lib/votingScheduler')
const { startWebsiteMonitor } = require('./lib/websiteMonitor')
const { askGemini } = require('./lib/gemini')
const { startSaldoScheduler } = require('./lib/saldoScheduler')
const { startIbadahScheduler } = require('./lib/ibadahScheduler')

// ============================================================
// CONFIG
// ============================================================

const prefix = process.env.PREFIX || '/'

const loginMethod = String(
  process.env.LOGIN_METHOD || 'pairing'
).toLowerCase()

const owner = String(
  process.env.OWNER_NUMBER || ''
).replace(/\D/g, '')

const configuredOwnerLids = String(
  process.env.OWNER_LID || ''
)
  .split(',')
  .map(x => x.trim())
  .filter(Boolean)
  .map(x => (x.includes('@lid') ? x : `${x}@lid`))

const autoRead =
  String(process.env.AUTO_READ || 'false').toLowerCase() === 'true'

// ============================================================
// GLOBAL STATE
// ============================================================

let schedulerStarted = false
let activeSock = null

// ============================================================
// HELPERS
// ============================================================

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

function isGroup(jid = '') {
  return jid.endsWith('@g.us')
}

// ============================================================
// RESOLVE SENDER IDENTITY
// ============================================================

async function resolveSenderIdentity(sock, msg) {
  const key = msg?.key || {}

  const candidates = [
    key.participantPn,
    key.senderPn,
    key.participantAlt,
    key.remoteJidAlt,
    key.participant,
    key.remoteJid
  ].filter(Boolean)

  const phones = []

  const lids = candidates
    .filter(jid => String(jid).includes('@lid'))
    .map(String)

  // Ambil nomor dari JID biasa
  for (const jid of candidates) {
    if (String(jid).includes('@s.whatsapp.net')) {
      phones.push(jidPhone(jid))
    }
  }

  // Resolve LID -> Phone Number
  for (const jid of candidates) {
    if (!String(jid).includes('@lid')) {
      continue
    }

    try {
      let pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(jid)

      if (!pn) {
        const lid = String(jid).split('@')[0]

        pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(
          lid
        )
      }

      if (pn) {
        phones.push(jidPhone(pn))
      }
    } catch (error) {
      console.error('[LID RESOLVE]', error.message)
    }
  }

  const uniquePhones = [
    ...new Set(phones.filter(Boolean))
  ]

  return {
    phone: uniquePhones[0] || '',
    phones: uniquePhones,
    lids,
    candidates
  }
}

// ============================================================
// AI GROUP FILTER
// ============================================================

async function shouldAiReply(sock, msg) {
  const chat = msg.key.remoteJid

  // Private chat -> langsung boleh balas
  if (!isGroup(chat)) {
    return true
  }

  const info =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    {}

  const me =
    sock.user?.id
      ?.split(':')[0]
      ?.split('@')[0] || ''

  const mentioned = (info.mentionedJid || []).some(
    jid => jidPhone(jid) === me
  )

  const repliedToBot =
    !!getQuotedMessage(msg) &&
    jidPhone(info.participant || '') === me

  return mentioned || repliedToBot
}

// ============================================================
// START BOT
// ============================================================

async function start() {
  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  const {
    state,
    saveCreds
  } = await useMultiFileAuthState('./sessions')

  const {
    version
  } = await fetchLatestBaileysVersion()

  // ----------------------------------------------------------
  // CREATE SOCKET
  // ----------------------------------------------------------

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({
      level: 'silent'
    }),
    printQRInTerminal: false,
    browser: [
      'SUPER-BOT',
      'Chrome',
      '1.0.0'
    ]
  })

  sock.ev.on('creds.update', saveCreds)

  // ==========================================================
  // PAIRING CODE
  // ==========================================================

  if (
    !state.creds.registered &&
    loginMethod === 'pairing'
  ) {
    let number = String(
      process.env.PAIRING_NUMBER || ''
    ).replace(/\D/g, '')

    if (!number) {
      number = String(
        await ask(
          'Masukkan nomor WhatsApp (628xxx): '
        )
      ).replace(/\D/g, '')
    }

    setTimeout(async () => {
      try {
        const code =
          await sock.requestPairingCode(number)

        const formattedCode =
          code.match(/.{1,4}/g)?.join('-') ||
          code

        console.log(
          '\n🔑 PAIRING CODE:',
          formattedCode,
          '\n'
        )
      } catch (error) {
        console.error(
          'Gagal membuat pairing code:',
          error.message
        )
      }
    }, 1500)
  }

  // ==========================================================
  // CONNECTION UPDATE
  // ==========================================================

  sock.ev.on('connection.update', update => {
    // --------------------------------------------------------
    // QR LOGIN
    // --------------------------------------------------------

    if (
      !state.creds.registered &&
      loginMethod === 'qr' &&
      update.qr
    ) {
      console.log(
        '\n📱 Scan QR berikut dari WhatsApp > ' +
        'Perangkat tertaut > Tautkan perangkat:\n'
      )

      qrcode.generate(update.qr, {
        small: true
      })
    }

    // --------------------------------------------------------
    // CONNECTED
    // --------------------------------------------------------

    if (update.connection === 'open') {
      activeSock = sock

      console.log(
        '✅ SUPER-BOT terhubung. AUTO_READ =',
        autoRead
      )

      // Scheduler cukup dijalankan sekali
      if (!schedulerStarted) {
        schedulerStarted = true

        startVotingScheduler(() => activeSock)
        startWebsiteMonitor(() => activeSock)
        startIbadahScheduler(() => activeSock)
      }

      // Saldo scheduler menggunakan socket aktif
      startSaldoScheduler(() => activeSock)
    }

    // --------------------------------------------------------
    // DISCONNECTED
    // --------------------------------------------------------

    if (update.connection === 'close') {
      if (activeSock === sock) {
        activeSock = null
      }

      const code = new Boom(
        update.lastDisconnect?.error
      )?.output?.statusCode

      if (code !== DisconnectReason.loggedOut) {
        console.log(
          '⚠️ Koneksi putus, reconnect...'
        )

        setTimeout(start, 2000)
      } else {
        console.log(
          '❌ Session logout. ' +
          'Hapus folder sessions lalu login ulang ' +
          `dengan metode ${loginMethod}.`
        )
      }
    }
  })

  // ==========================================================
  // MESSAGE HANDLER
  // ==========================================================

  sock.ev.on('messages.upsert', async update => {
    for (const msg of update.messages || []) {
      try {
        // ----------------------------------------------------
        // VALIDASI MESSAGE
        // ----------------------------------------------------

        if (!msg.message) {
          continue
        }

        const chat = msg.key.remoteJid

        if (
          !chat ||
          chat === 'status@broadcast'
        ) {
          continue
        }

        // ----------------------------------------------------
        // AIRBOT BRIDGE
        // ----------------------------------------------------

        if (
          !msg.key.fromMe &&
          await handleAirbotGroupMessage(sock, msg)
        ) {
          continue
        }

        // ----------------------------------------------------
        // AUTO READ
        // ----------------------------------------------------

        if (autoRead) {
          await sock
            .readMessages([msg.key])
            .catch(() => {})
        }

        // ----------------------------------------------------
        // GET MESSAGE TEXT
        // ----------------------------------------------------

        const body = getText(msg).trim()

        console.log(
          '[RX]',
          msg.key.fromMe ? 'SELF' : 'IN',
          chat,
          'body=',
          JSON.stringify(body)
        )

        // Abaikan output bot sendiri
        if (
          msg.key.fromMe &&
          body &&
          /^[╭│├╰_✅❌💳📋🔄📦]/u.test(body)
        ) {
          continue
        }

        // ----------------------------------------------------
        // IDENTIFY SENDER
        // ----------------------------------------------------

        const ident =
          await resolveSenderIdentity(sock, msg)

        let phone = ident.phone

        let user = phone
          ? db.getUser(phone)
          : null

        const selfPhone = jidPhone(
          sock.user?.id || ''
        )

        const selfMessage =
          !!msg.key.fromMe

        // ----------------------------------------------------
        // FIND USER FROM ALTERNATIVE PHONE
        // ----------------------------------------------------

        if (!user) {
          for (const candidatePhone of ident.phones) {
            const found =
              db.getUser(candidatePhone)

            if (found) {
              phone = candidatePhone
              user = found
              break
            }
          }
        }

        // ----------------------------------------------------
        // OWNER AUTH
        // ----------------------------------------------------

        const ownerLids = [
          ...new Set([
            ...configuredOwnerLids,
            ...db.getSetting(
              'ownerLids',
              []
            )
          ])
        ]

        let isOwner =
          selfMessage ||
          (owner && selfPhone === owner) ||
          ident.phones.includes(owner) ||
          phone === owner ||
          user?.role === 'owner' ||
          ident.phones.some(n => (db.getSetting('extraOwners', []) || []).includes(n)) ||
          (db.getSetting('extraOwners', []) || []).includes(phone) ||
          ident.lids.some(
            lid => ownerLids.includes(lid)
          )

        // ----------------------------------------------------
        // AUTO MAP OWNER LID
        // ----------------------------------------------------

        if (
          !isOwner &&
          owner &&
          ident.lids.length &&
          ident.phones.includes(owner)
        ) {
          isOwner = true

          db.setSetting(
            'ownerLids',
            [
              ...new Set([
                ...ownerLids,
                ...ident.lids
              ])
            ]
          )
        }

        // ----------------------------------------------------
        // SAVE OWNER LID
        // ----------------------------------------------------

        if (isOwner) {
          if (ident.lids.length) {
            const saved =
              db.getSetting(
                'ownerLids',
                []
              )

            const merged = [
              ...new Set([
                ...saved,
                ...ident.lids
              ])
            ]

            if (
              merged.length !==
              saved.length
            ) {
              db.setSetting(
                'ownerLids',
                merged
              )
            }
          }

          console.log(
            '[AUTH] OWNER matched',
            phone || ident.lids[0]
          )
        } else if (
          ident.lids.length &&
          !user
        ) {
          console.log(
            '[AUTH] unresolved/unregistered sender',
            'jid=',
            ident.lids[0],
            'pn=',
            ident.phones.join(',') || '-',
            'alt=',
            msg.key.participantAlt ||
              msg.key.remoteJidAlt ||
              '-'
          )
        }

        // ====================================================
        // COMMAND HANDLER
        // ====================================================

        if (body) {
          const plugins = loadPlugins()

          const prefixed =
            body.startsWith(prefix) ||
            body.startsWith('.')

          const raw = (
            prefixed
              ? body.slice(1)
              : body
          ).trim()

          const [
            commandName,
            ...args
          ] = raw.split(/\s+/)

          const command =
            String(
              commandName || ''
            ).toLowerCase()

          const plugin =
            plugins.find(
              item =>
                item.commands.includes(command)
            )

          console.log(
            '[COMMAND]',
            command,
            'plugin=',
            plugin?.file || '-',
            'owner=',
            isOwner,
            'registered=',
            !!user
          )

          // --------------------------------------------------
          // PLUGIN FOUND
          // --------------------------------------------------

          if (plugin) {
            // Registered only
            if (
              plugin.registered !== false &&
              !user &&
              !isOwner
            ) {
              console.log(
                '[AUTH] blocked registered command',
                command,
                'jid=',
                ident.lids[0] ||
                  ident.candidates[0] ||
                  '-'
              )

              continue
            }

            // Owner only
            if (
              plugin.ownerOnly &&
              !isOwner
            ) {
              console.log(
                '[AUTH] blocked owner command',
                command,
                'jid=',
                ident.lids[0] ||
                  ident.candidates[0] ||
                  '-'
              )

              continue
            }

            // Reply helper
            const reply = text =>
              sock.sendMessage(
                chat,
                {
                  text: String(text)
                },
                {
                  quoted: msg
                }
              )

            try {
              console.log(
                '[PLUGIN] run',
                plugin.file
              )

              await plugin.run({
                sock,
                msg,
                reply,
                command,
                args,
                text: args.join(' '),
                phone:
                  phone ||
                  owner ||
                  selfPhone,
                user,
                isOwner,
                db
              })

              console.log(
                '[PLUGIN] done',
                plugin.file
              )
            } catch (error) {
              console.error(
                '[PLUGIN ERROR]',
                plugin.file,
                error
              )

              await reply(
                '❌ Command gagal: ' +
                String(
                  error?.message ||
                  error
                )
              ).catch(() => {})
            }

            continue
          }

          // Command dengan prefix tapi plugin tidak ada
          if (prefixed) {
            continue
          }
        }

        // ====================================================
        // AI / GEMINI
        // ====================================================

        if (selfMessage) {
          continue
        }

        if (
          (!user && !isOwner) ||
          !db.getSetting(
            'aiEnabled',
            false
          ) ||
          !body
        ) {
          continue
        }

        if (
          !(await shouldAiReply(
            sock,
            msg,
            body
          ))
        ) {
          continue
        }

        try {
          // Typing...
          await sock
            .sendPresenceUpdate(
              'composing',
              chat
            )
            .catch(() => {})

          const clean =
            body
              .replace(/@\d+/g, '')
              .trim() ||
            body

          const answer =
            await askGemini(clean)

          if (answer) {
            await sock.sendMessage(
              chat,
              {
                text: answer
              },
              {
                quoted: msg
              }
            )
          }
        } catch (error) {
          console.error(
            '[GEMINI FINAL]',
            error.message
          )

          const publicMessage =
            error?.publicMessage ||
            '⚠️ AI sedang mengalami gangguan. ' +
            'Coba lagi beberapa saat.'

          await sock
            .sendMessage(
              chat,
              {
                text: publicMessage
              },
              {
                quoted: msg
              }
            )
            .catch(() => {})
        } finally {
          await sock
            .sendPresenceUpdate(
              'paused',
              chat
            )
            .catch(() => {})
        }
      } catch (error) {
        console.error(
          '[MESSAGE ERROR]',
          error
        )
      }
    }
  })
}

// ============================================================
// BOOT
// ============================================================

start().catch(console.error)
