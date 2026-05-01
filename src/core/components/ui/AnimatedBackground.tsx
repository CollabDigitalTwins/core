'use client'

import { useEffect, useRef, useState } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

interface Props {
  theme?: 'light' | 'dark'
}

export default function AnimatedBackground({ theme }: Props = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 })
  const [isDark, setIsDark] = useState(theme !== undefined ? theme === 'dark' : true)

  useEffect(() => {
    // If theme is controlled externally, just sync and skip the observer
    if (theme !== undefined) {
      setIsDark(theme === 'dark')
      return
    }

    // Auto-detect from document for standalone usage (hero section)
    setIsDark(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    return () => observer.disconnect()
  }, [theme])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let animationFrameId: number
    let time = 0
    let offsetX = 0

    interface DataNode {
      x: number
      y: number
      baseX: number
      baseY: number
      connections: number[]
      pulse: number
    }

    const dataNodes: DataNode[] = []
    const gridSize = 100
    const nodeSpacing = 150
    // Render extra columns for seamless wrap
    const nodeCols = Math.ceil(canvas.width / nodeSpacing) + 2
    const nodeRows = Math.ceil(canvas.height / nodeSpacing)

    for (let row = 0; row < nodeRows; row++) {
      for (let col = 0; col < nodeCols; col++) {
        const index = row * nodeCols + col
        const baseX = col * nodeSpacing + nodeSpacing / 2
        const baseY = row * nodeSpacing + nodeSpacing / 2
        dataNodes.push({
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          connections: [],
          pulse: (row + col) * 0.5
        })
      }
    }

    dataNodes.forEach((node, i) => {
      const col = i % nodeCols
      const row = Math.floor(i / nodeCols)
      if (col < nodeCols - 1) {
        node.connections.push(i + 1)
      }
      if (row < nodeRows - 1) {
        node.connections.push(i + nodeCols)
      }
    })

    const draw = () => {
      time += 0.008
      // Move left slowly
      offsetX += 0.1 // Lower for slower movement
      // Loop offsetX to avoid overflow and create infinite effect
      if (offsetX > nodeSpacing) offsetX -= nodeSpacing

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Theme-aware colors
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      if (isDark) {
        bgGradient.addColorStop(0, 'rgba(239, 145, 97, 0.025)')
        bgGradient.addColorStop(1, 'rgba(180, 90, 40, 0.02)')
      } else {
        bgGradient.addColorStop(0, 'rgba(239, 146, 98, 0.08)')
        bgGradient.addColorStop(1, 'rgba(239, 146, 98, 0.06)')
      }
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Animate node positions with floating effect
      dataNodes.forEach((node, i) => {
        const floatX = Math.sin(time * 0.3 + node.pulse) * 2
        const floatY = Math.cos(time * 0.2 + node.pulse) * 2
        // Shift node baseX by offsetX for infinite left movement
        let x = node.baseX - offsetX + floatX
        // Wrap node.x to the right if it goes off the left edge
        x = ((x + nodeCols * nodeSpacing) % (nodeCols * nodeSpacing))
        node.x = x
        node.y = node.baseY + floatY
      })

      // Theme-aware grid lines
      ctx.strokeStyle = isDark ? 'rgba(239, 145, 97, 0.08)' : 'rgba(239, 146, 98, 0.3)'
      ctx.lineWidth = 0.5
      
      for (let y = canvas.height; y > canvas.height * 0.3; y -= gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
      
      const verticalSpacing = gridSize * 1.5
      // Render extra vertical grid lines for seamless wrap
      const gridCols = Math.ceil(canvas.width / verticalSpacing) + 2
      for (let i = 0; i < gridCols; i++) {
        // Shift grid lines by offsetX for infinite left movement
        let x = i * verticalSpacing - offsetX % verticalSpacing - verticalSpacing
        // Wrap x for seamless effect
        x = ((x + gridCols * verticalSpacing) % (gridCols * verticalSpacing))
        ctx.beginPath()
        ctx.moveTo(x, canvas.height)
        ctx.lineTo(x + (x - canvas.width / 2) * 0.3, canvas.height * 0.3)
        ctx.stroke()
      }

      // Theme-aware connections with data flow
      ctx.lineWidth = 0.8
      dataNodes.forEach((node, i) => {
        node.connections.forEach(targetIndex => {
          const target = dataNodes[targetIndex]
          const pulse = (Math.sin(time + node.pulse) + 1) / 2
          
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.strokeStyle = isDark
            ? `rgba(239, 145, 97, ${0.1 + pulse * 0.08})`
            : `rgba(239, 146, 98, ${0.35 + pulse * 0.2})`
          ctx.stroke()

          // Animated data particles flowing along connections
          const flowProgress = (time * 0.3 + node.pulse) % 1
          const particleX = node.x + (target.x - node.x) * flowProgress
          const particleY = node.y + (target.y - node.y) * flowProgress

          ctx.beginPath()
          ctx.arc(particleX, particleY, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = isDark
            ? `rgba(239, 145, 97, ${0.5 + pulse * 0.3})`
            : `rgba(239, 146, 98, ${0.7 + pulse * 0.3})`
          ctx.fill()
        })
      })

      // Theme-aware nodes
      dataNodes.forEach(node => {
        const pulse = (Math.sin(time + node.pulse) + 1) / 2
        const size = 2.5 + pulse * 1
        
        ctx.beginPath()
        ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2)
        ctx.fillStyle = isDark
          ? `rgba(239, 145, 97, ${0.12 + pulse * 0.1})`
          : `rgba(239, 146, 98, ${0.3 + pulse * 0.15})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        ctx.fillStyle = isDark
          ? `rgba(239, 145, 97, ${0.55 + pulse * 0.25})`
          : `rgba(239, 146, 98, ${0.75 + pulse * 0.2})`
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
    }
  }, [smoothMouseX, smoothMouseY, isDark])

  const assetsUrl = process.env.NEXT_PUBLIC_MINIO_BUCKET_URL || ''

  return (
    <>
      <div className="absolute top-0 right-0 inset-0 z-10 w-screen">
        <img
          src={`${assetsUrl}/cdt-homepage/home-bg.png`}
          alt="Background"
          className="object-cover opacity-10 w-screen"
          style={{ filter: isDark ? 'invert(0)' : 'invert(1)' }}
        />
      </div>
      <div className="absolute w-screen inset-0 bg-gradient-to-br from-background/10 via-background/5 to-primary/5" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-30"
        style={{ mixBlendMode: isDark ? 'screen' : 'multiply' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-background/10 to-transparent" />
    </>
  )
}
