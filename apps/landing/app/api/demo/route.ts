import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { name, brand, email, phone, website, interests, message } = await request.json()

  try {
    await resend.emails.send({
      from: 'Halite Demo Form <onboarding@resend.dev>',
      to: 'demo@haliteintelligence.com',
      replyTo: email,
      subject: `Demo request — ${brand}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;color:#1A0A12">
          <h2 style="color:#450F2A;margin-bottom:24px">New demo request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#8B6575;width:120px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#8B6575">Brand</td><td style="padding:8px 0;font-weight:600">${brand}</td></tr>
            <tr><td style="padding:8px 0;color:#8B6575">Email</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#450F2A">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#8B6575">Phone</td><td style="padding:8px 0">${phone}</td></tr>
            <tr><td style="padding:8px 0;color:#8B6575">Website</td><td style="padding:8px 0">${website || '—'}</td></tr>
          </table>
          <div style="margin-top:20px">
            <p style="color:#8B6575;margin-bottom:8px">Interested in</p>
            <ul style="margin:0;padding-left:18px">
              ${(interests as string[]).map(i => `<li style="margin-bottom:4px">${i}</li>`).join('')}
            </ul>
          </div>
          ${message ? `<div style="margin-top:20px"><p style="color:#8B6575;margin-bottom:4px">Message</p><p style="margin:0">${message}</p></div>` : ''}
        </div>
      `,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Demo email error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
