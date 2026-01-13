import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Tribe - Email list management for creators'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0c0c0c 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Logo/Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 400,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: 20,
          }}
        >
          Tribe
        </div>
        
        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 400,
          }}
        >
          Email list management for creators
        </div>
        
        {/* Accent line */}
        <div
          style={{
            width: 80,
            height: 3,
            background: 'linear-gradient(90deg, transparent, rgba(232, 184, 74, 0.6), transparent)',
            marginTop: 40,
            borderRadius: 2,
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
