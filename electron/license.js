const https = require('https')

// Lemon Squeezy license validation
// Set your store ID and API key in env or hardcode for builds
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || ''

function validateLicense(key) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      license_key: key,
      instance_name: getInstanceId(),
    })

    const options = {
      hostname: 'api.lemonsqueezy.com',
      path: '/v1/licenses/activate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Accept': 'application/json',
      },
      timeout: 10000,
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(body)
          if (json.activated || json.valid) {
            resolve({
              valid: true,
              license_key: json.license_key,
              customer_name: json.meta?.customer_name || '',
              variant: json.meta?.variant_name || 'pro',
            })
          } else {
            resolve({ valid: false, error: json.error || 'Invalid license key' })
          }
        } catch {
          resolve({ valid: false, error: 'Invalid response from license server' })
        }
      })
    })

    req.on('error', () => resolve({ valid: false, error: 'Could not reach license server' }))
    req.on('timeout', () => { req.destroy(); resolve({ valid: false, error: 'License server timeout' }) })
    req.write(data)
    req.end()
  })
}

function deactivateLicense(key) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      license_key: key,
      instance_id: getInstanceId(),
    })

    const options = {
      hostname: 'api.lemonsqueezy.com',
      path: '/v1/licenses/deactivate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Accept': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => resolve(true))
    })

    req.on('error', () => resolve(false))
    req.write(data)
    req.end()
  })
}

function getInstanceId() {
  const os = require('os')
  const crypto = require('crypto')
  const raw = `${os.hostname()}-${os.userInfo().username}-${os.platform()}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

module.exports = { validateLicense, deactivateLicense }
