import type { Canvas, Image } from 'canvas'
import { createCanvas, loadImage } from 'canvas'

// Isometric body/head compositing geometry ported from crafatar's lib/renders.js
// https://github.com/crafatar/crafatar/blob/master/lib/renders.js
// Skin part locations originally based on https://github.com/confuser/serverless-mc-skin-viewer
//
// The MIT License (MIT)
// Copyright (c) 2020 Crafatar Team
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export type MinecraftAvatarRenderKind = 'body' | 'head' | 'avatar'

function removeTransparency(canvas: Canvas): Canvas {
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function hasTransparency(canvas: Canvas): boolean {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 255) return true
  }
  return false
}

function resize(source: Canvas, scale: number): Canvas {
  const destination = createCanvas(scale * source.width, scale * source.height)
  const ctx = destination.getContext('2d')
  ctx.patternQuality = 'fast'
  ctx.drawImage(source, 0, 0, source.width * scale, source.height * scale)
  return destination
}

function getPart(source: Image | Canvas, x: number, y: number, width: number, height: number, scale: number): Canvas {
  const destination = createCanvas(scale * width, scale * height)
  const ctx = destination.getContext('2d')
  ctx.patternQuality = 'fast'
  ctx.drawImage(source, x, y, width, height, 0, 0, width * scale, height * scale)
  return destination
}

function flip(source: Canvas): Canvas {
  const destination = createCanvas(source.width, source.height)
  const ctx = destination.getContext('2d')
  ctx.scale(-1, 1)
  ctx.drawImage(source, -source.width, 0)
  return destination
}

const skewA = 26 / 45
const skewB = skewA * 2

async function drawIsometricModel(skinBytes: Buffer, scale: number, overlay: boolean, isBody: boolean, slim: boolean): Promise<Buffer> {
  const canvas = createCanvas(scale * 20, scale * (isBody ? 45.1 : 18.5))
  const ctx = canvas.getContext('2d')
  const skin = await loadImage(skinBytes)

  const oldSkin = skin.height === 32
  const armWidth = slim ? 3 : 4

  const headTop = resize(removeTransparency(getPart(skin, 8, 0, 8, 8, 1)), scale)
  const headFront = resize(removeTransparency(getPart(skin, 8, 8, 8, 8, 1)), scale)
  const headRight = resize(removeTransparency(getPart(skin, 0, 8, 8, 8, 1)), scale)

  const armRightTop = resize(removeTransparency(getPart(skin, 44, 16, armWidth, 4, 1)), scale)
  const armRightFront = resize(removeTransparency(getPart(skin, 44, 20, armWidth, 12, 1)), scale)
  const armRightSide = resize(removeTransparency(getPart(skin, 40, 20, 4, 12, 1)), scale)

  const armLeftTop = oldSkin ? flip(armRightTop) : resize(removeTransparency(getPart(skin, 36, 48, armWidth, 4, 1)), scale)
  const armLeftFront = oldSkin ? flip(armRightFront) : resize(removeTransparency(getPart(skin, 36, 52, armWidth, 12, 1)), scale)

  const legRightFront = resize(removeTransparency(getPart(skin, 4, 20, 4, 12, 1)), scale)
  const legRightSide = resize(removeTransparency(getPart(skin, 0, 20, 4, 12, 1)), scale)

  const legLeftFront = oldSkin ? flip(legRightFront) : resize(removeTransparency(getPart(skin, 20, 52, 4, 12, 1)), scale)

  const bodyFront = resize(removeTransparency(getPart(skin, 20, 20, 8, 12, 1)), scale)

  if (overlay) {
    if (hasTransparency(getPart(skin, 32, 0, 32, 32, 1))) {
      headTop.getContext('2d').drawImage(getPart(skin, 40, 0, 8, 8, scale), 0, 0)
      headFront.getContext('2d').drawImage(getPart(skin, 40, 8, 8, 8, scale), 0, 0)
      headRight.getContext('2d').drawImage(getPart(skin, 32, 8, 8, 8, scale), 0, 0)
    }

    if (!oldSkin) {
      const bodyRegion = getPart(skin, 16, 32, 32, 16, 1)
      const rightArmRegion = getPart(skin, 48, 48, 16, 16, 1)
      const leftArmRegion = getPart(skin, 40, 32, 16, 16, 1)
      const rightLegRegion = getPart(skin, 0, 32, 16, 16, 1)
      const leftLegRegion = getPart(skin, 0, 48, 16, 16, 1)

      if (hasTransparency(bodyRegion)) {
        bodyFront.getContext('2d').drawImage(getPart(skin, 20, 36, 8, 12, scale), 0, 0)
      }

      if (hasTransparency(rightArmRegion)) {
        armRightTop.getContext('2d').drawImage(getPart(skin, 44, 32, armWidth, 4, scale), 0, 0)
        armRightFront.getContext('2d').drawImage(getPart(skin, 44, 36, armWidth, 12, scale), 0, 0)
        armRightSide.getContext('2d').drawImage(getPart(skin, 40, 36, 4, 12, scale), 0, 0)
      }

      if (hasTransparency(leftArmRegion)) {
        armLeftTop.getContext('2d').drawImage(getPart(skin, 36 + 16, 48, armWidth, 4, scale), 0, 0)
        armLeftFront.getContext('2d').drawImage(getPart(skin, 36 + 16, 52, armWidth, 12, scale), 0, 0)
      }

      if (hasTransparency(rightLegRegion)) {
        legRightFront.getContext('2d').drawImage(getPart(skin, 4, 36, 4, 12, scale), 0, 0)
        legRightSide.getContext('2d').drawImage(getPart(skin, 0, 36, 4, 12, scale), 0, 0)
      }

      if (hasTransparency(leftLegRegion)) {
        legLeftFront.getContext('2d').drawImage(getPart(skin, 4, 52, 4, 12, scale), 0, 0)
      }
    }
  }

  let x: number
  let y: number
  let z: number

  const zOffset = scale * 3
  const xOffset = scale * 2

  if (isBody) {
    const front = createCanvas(scale * 16, scale * 24)
    const frontCtx = front.getContext('2d')
    frontCtx.patternQuality = 'fast'

    frontCtx.drawImage(armRightFront, (4 - armWidth) * scale, 0 * scale, armWidth * scale, 12 * scale)
    frontCtx.drawImage(armLeftFront, 12 * scale, 0 * scale, armWidth * scale, 12 * scale)
    frontCtx.drawImage(bodyFront, 4 * scale, 0 * scale, 8 * scale, 12 * scale)
    frontCtx.drawImage(legRightFront, 4 * scale, 12 * scale, 4 * scale, 12 * scale)
    frontCtx.drawImage(legLeftFront, 8 * scale, 12 * scale, 4 * scale, 12 * scale)

    // top
    x = xOffset + scale * 2
    y = scale * -armWidth
    z = zOffset + scale * 8
    ctx.setTransform(1, -skewA, 1, skewA, 0, 0)
    ctx.drawImage(armRightTop, y - z - 0.5, x + z, armRightTop.width + 1, armRightTop.height + 1)

    y = scale * 8
    ctx.drawImage(armLeftTop, y - z, x + z, armLeftTop.width, armLeftTop.height + 1)

    // right side
    ctx.setTransform(1, skewA, 0, skewB, 0, 0)
    x = xOffset + scale * 2
    y = 0
    z = zOffset + scale * 20
    ctx.drawImage(legRightSide, x + y, z - y, legRightSide.width, legRightSide.height)

    x = xOffset + scale * 2
    y = scale * -armWidth
    z = zOffset + scale * 8
    ctx.drawImage(armRightSide, x + y, z - y - 0.5, armRightSide.width, armRightSide.height + 1)

    // front
    z = zOffset + scale * 12
    y = 0
    ctx.setTransform(1, -skewA, 0, skewB, 0, skewA)
    ctx.drawImage(front, y + x, x + z - 0.5, front.width, front.height)
  }

  // head top
  x = xOffset
  y = -0.5
  z = zOffset
  ctx.setTransform(1, -skewA, 1, skewA, 0, 0)
  ctx.drawImage(headTop, y - z, x + z, headTop.width, headTop.height + 1)

  // head front
  x = xOffset + 8 * scale
  y = 0
  z = zOffset - 0.5
  ctx.setTransform(1, -skewA, 0, skewB, 0, skewA)
  ctx.drawImage(headFront, y + x, x + z, headFront.width, headFront.height)

  // head right
  x = xOffset
  y = 0
  z = zOffset
  ctx.setTransform(1, skewA, 0, skewB, 0, 0)
  ctx.drawImage(headRight, x + y, z - y - 0.5, headRight.width + 0.5, headRight.height + 1)

  return canvas.toBuffer('image/png')
}

function drawFace(skinBytes: Buffer, scale: number, overlay: boolean): Promise<Buffer> {
  return loadImage(skinBytes).then((skin) => {
    const face = resize(removeTransparency(getPart(skin, 8, 8, 8, 8, 1)), scale)

    if (overlay && hasTransparency(getPart(skin, 32, 0, 32, 32, 1))) {
      face.getContext('2d').drawImage(getPart(skin, 40, 8, 8, 8, scale), 0, 0)
    }

    return face.toBuffer('image/png')
  })
}

const MINECRAFT_AVATAR_RENDER_SCALE = 8

export function renderMinecraftAvatarIcon(skinBytes: Buffer): Promise<Buffer> {
  return drawFace(skinBytes, MINECRAFT_AVATAR_RENDER_SCALE, true)
}

export function renderMinecraftHead(skinBytes: Buffer, slim: boolean): Promise<Buffer> {
  return drawIsometricModel(skinBytes, MINECRAFT_AVATAR_RENDER_SCALE, true, false, slim)
}

export function renderMinecraftBody(skinBytes: Buffer, slim: boolean): Promise<Buffer> {
  return drawIsometricModel(skinBytes, MINECRAFT_AVATAR_RENDER_SCALE, true, true, slim)
}
