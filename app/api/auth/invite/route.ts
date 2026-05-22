import { NextResponse } from 'next/server'
import {
  deleteInvite,
  getHouseholdMeta,
  getInvite,
  setHouseholdMeta,
  setInvite,
} from '@/lib/server/blob-storage'
import { requireHouseholdId } from '@/lib/server/http'

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createInviteCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  }
  return code
}

async function createUniqueInviteCode() {
  let code = createInviteCode()
  while (await getInvite(code)) {
    code = createInviteCode()
  }
  return code
}

export async function POST() {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const meta = await getHouseholdMeta(householdId)
  const inviteCode = await createUniqueInviteCode()

  await Promise.all([
    meta?.inviteCode ? deleteInvite(meta.inviteCode) : Promise.resolve(),
    setInvite(inviteCode, { householdId }),
    setHouseholdMeta(householdId, { inviteCode }),
  ])

  return NextResponse.json({ inviteCode })
}
