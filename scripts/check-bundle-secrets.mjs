import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const root = new URL('../dist/', import.meta.url)
const suspicious = [/CMA_API_KEY/i, /KeyId\s*[:=]/i, /apis\.cma-cgm\.net[^"']*[?&](?:key|token)=/i]

async function files(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) found.push(...await files(new URL(`${entry.name}/`, directory)))
    else found.push(new URL(entry.name, directory))
  }
  return found
}

const matches = []
for (const file of await files(root)) {
  if (!['.js', '.css', '.html'].includes(extname(file.pathname))) continue
  const content = await readFile(file, 'utf8')
  if (suspicious.some((pattern) => pattern.test(content))) matches.push(join('dist', file.pathname.split('/dist/')[1]))
}

if (matches.length) {
  console.error(`Potential API secret references found in: ${matches.join(', ')}`)
  process.exit(1)
}
console.log('Bundle secret scan passed.')