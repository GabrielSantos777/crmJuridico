const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const [, , email, password, officeId = 'office_default'] = process.argv

if (!email || !password) {
  console.error('Usage: node create_admin.js <email> <password> [officeId]')
  process.exit(1)
}

async function main() {
  const prisma = new PrismaClient()
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      role: 'ADMIN',
      officeId,
      name: 'Admin',
    },
    create: {
      email,
      password: hash,
      role: 'ADMIN',
      officeId,
      name: 'Admin',
    },
  })
  console.log(`ok:${user.id}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
