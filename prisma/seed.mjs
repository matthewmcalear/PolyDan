// Seeds the admin account and every past Iron Man competitor.
//   ADMIN_NAME=Matt ADMIN_PIN=1234 npm run seed
import { randomBytes, scryptSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const history = JSON.parse(readFileSync(new URL('../data/iron-man-history.json', import.meta.url)))

const name = process.env.ADMIN_NAME ?? 'Matt'
const pin = process.env.ADMIN_PIN
if (!pin || !/^\d{4,8}$/.test(pin)) {
  console.error('Set ADMIN_PIN (4–8 digits)')
  process.exit(1)
}
const salt = randomBytes(16).toString('hex')
const pinHash = `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`

await prisma.user.upsert({ where: { name }, create: { name, pinHash, isAdmin: true }, update: { isAdmin: true } })
for (const { name: c } of history.leaderboard) {
  await prisma.competitor.upsert({ where: { name: c }, create: { name: c }, update: {} })
}
console.log(`Admin "${name}" ready; ${history.leaderboard.length} competitors seeded.`)
await prisma.$disconnect()
