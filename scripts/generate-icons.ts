import sharp from 'sharp'
import { mkdirSync } from 'fs'

async function generateIcons() {
  mkdirSync('public/icons', { recursive: true })

  const sizes = [192, 512, 180]
  for (const size of sizes) {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 30, g: 41, b: 59, alpha: 1 }, // #1E293B navy
      },
    })
      .png()
      .toFile(`public/icons/icon-${size}.png`)

    console.log(`Created icon-${size}.png`)
  }
}

generateIcons()
