"use client"

import * as React from 'react'
import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import * as LR from 'lucide-react'
import { createRoot } from 'react-dom/client'
import { BimContext } from '../../../../../../../store'

interface FileAttachmentProps {
  selectedFile: File | null
  onCancel: () => void
  onFileAttached?: (file: File, position: THREE.Vector3) => void
}

export default function AddFile({
  selectedFile,
  onFileAttached,
  onCancel,
}: FileAttachmentProps) {
  const { world, fragments } = React.useContext(BimContext).state.bim

  React.useEffect(() => {
    if (!selectedFile || !world) return

    // Mouse vector for raycasting
    const mouse = new THREE.Vector2()

    // Custom raycast function
    const raycast = async (data: {
      camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
      mouse: THREE.Vector2
      dom: HTMLCanvasElement
    }) => {
      const results = []

      for (const [_, model] of fragments.core.models.list) {
        const result = await model.raycast(data)
        if (result) {
          results.push(result)
        }
      }

      await Promise.all(results)
      if (results.length === 0) return null

      // Find result with smallest distance
      let closestResult = results[0]
      let minDistance = closestResult.distance

      for (let i = 1; i < results.length; i++) {
        if (results[i].distance < minDistance) {
          minDistance = results[i].distance
          closestResult = results[i]
        }
      }

      return closestResult
    }

    // Create CSS2D renderer if it doesn't exist
    const css2dRenderer = world.renderer?.three.domElement?.parentElement?.querySelector('.css2d-renderer') as HTMLElement

    if (!css2dRenderer) {
      const renderer = new CSS2DRenderer()
      renderer.setSize(world.renderer!.three.domElement!.clientWidth, world.renderer!.three.domElement!.clientHeight)
      renderer.domElement.style.position = 'absolute'
      renderer.domElement.style.top = '0'
      renderer.domElement.style.pointerEvents = 'none'
      renderer.domElement.classList.add('css2d-renderer')

      // Add to the same container as the WebGL renderer
      world.renderer!.three.domElement!.parentElement!.append(renderer.domElement);

      // Store reference for cleanup and rendering
      (world as any).css2dRenderer = renderer

      // Add render loop for CSS2D
      const originalRender = world.renderer!.three.render
      world.renderer!.three.render = function (scene: THREE.Scene, camera: THREE.Camera) {
        originalRender.call(this, scene, camera)
        renderer.render(scene, camera)
      }
    }

    // Create a file icon that follows the cursor
    const fileIcon = document.createElement('div')
    const root = createRoot(fileIcon)

    // Check if the file is an image
    const isImage = selectedFile.type.startsWith('image/')

    if (isImage) {
      // Create image preview
      const img = document.createElement('img')
      img.src = URL.createObjectURL(selectedFile)
      img.style.width = '30px'
      img.style.objectFit = 'cover'
      fileIcon.append(img)
    }
    else {
      // Use file icon for non-images
      root.render(<LR.File size={30} />)
    }

    fileIcon.style.position = 'fixed'
    fileIcon.style.pointerEvents = 'none'
    fileIcon.style.zIndex = '9999'
    fileIcon.style.transform = 'translate(-20px, -20px)'
    fileIcon.style.color = '#black'
    fileIcon.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
    fileIcon.style.borderRadius = '50%'
    fileIcon.style.padding = '0.5rem'
    fileIcon.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
    document.body.append(fileIcon)

    const handleMouseMove = async (e: MouseEvent) => {
      // Update file icon position (still use screen coordinates for UI)
      fileIcon.style.left = e.clientX + 'px'
      fileIcon.style.top = e.clientY + 'px'

      // Use screen coordinates for raycasting (not normalized)
      mouse.x = e.clientX
      mouse.y = e.clientY

      // Cast ray using custom raycast function
      const result = await raycast({
        camera: world.camera.three,
        mouse,
        dom: world.renderer!.three.domElement!,
      })

      if (result) {
        console.log('Ray hit point:', result.point)
        console.log('Ray hit normal:', result.normal)
      }
    }

    const handleClick = async (e: MouseEvent) => {
      // Use screen coordinates for raycasting (not normalized)
      mouse.x = e.clientX
      mouse.y = e.clientY

      const result = await raycast({
        camera: world.camera.three,
        mouse,
        dom: world.renderer!.three.domElement!,
      })

      if (result) {
        console.log('File placed at 3D position:', result.point)
        console.log('Full raycast result:', result)

        // Validate the point is not zero or invalid
        if (result.point && (result.point.x !== 0 || result.point.y !== 0 || result.point.z !== 0)) {
          // Create a small sphere at the hit position
          const sphereGeometry = new THREE.SphereGeometry(0.04, 10, 10)
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xFF_FF_00 })
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

          // Use the actual hit point
          sphere.position.set(result.point.x, result.point.y, result.point.z)

          // Add the sphere to the scene
          world.scene.three.add(sphere)

          // Create CSS2D label/image
          const labelDiv = document.createElement('div')
          labelDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
          labelDiv.style.borderRadius = '50%'
          labelDiv.style.padding = '0.5rem'
          labelDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
          labelDiv.style.fontSize = '12px'
          labelDiv.style.fontFamily = 'Arial, sans-serif'
          labelDiv.style.pointerEvents = 'auto'
          labelDiv.style.cursor = 'pointer'

          if (isImage) {
            // Create image label
            const img = document.createElement('img')
            img.src = URL.createObjectURL(selectedFile)
            img.style.width = '30px'
            img.style.objectFit = 'cover'
            img.style.borderRadius = '4px'
            img.style.display = 'block'
            img.style.marginBottom = '4px'

            labelDiv.append(img)
          }
          else {
            // Create file icon label
            const fileIconElement = document.createElement('div')
            fileIconElement.style.display = 'flex'
            fileIconElement.style.alignItems = 'center'
            fileIconElement.style.gap = '8px'

            const iconDiv = document.createElement('div')
            const iconRoot = createRoot(iconDiv)
            iconRoot.render(<LR.FileText />)
            iconDiv.style.fontSize = '24px'

            const textDiv = document.createElement('div')
            textDiv.textContent = selectedFile.name
            textDiv.style.color = '#333'
            textDiv.style.maxWidth = '120px'
            textDiv.style.overflow = 'hidden'
            textDiv.style.textOverflow = 'ellipsis'
            textDiv.style.whiteSpace = 'nowrap'
            textDiv.style.cursor = 'pointer'
            textDiv.style.display = 'none'
            textDiv.style.transition = 'color 0.2s ease'

            // Add hover effects
            textDiv.addEventListener('mouseenter', () => {
              fileIconElement.style.scale = '1.05'
            })

            textDiv.addEventListener('mouseleave', () => {
              fileIconElement.style.scale = '1'
            })

            fileIconElement.append(iconDiv)
            fileIconElement.append(textDiv)
            labelDiv.append(fileIconElement)
          }

          // Create CSS2D object
          const css2dObject = new CSS2DObject(labelDiv)
          css2dObject.position.copy(sphere.position)
          css2dObject.position.y += 0.1 // Offset slightly above the sphere

          // Add to scene
          world.scene.three.add(css2dObject)

          // Add click handler to the label for interaction
          labelDiv.addEventListener('click', () => {
            console.log('Label clicked for file:', selectedFile.name)
            const textDiv = labelDiv.querySelector('div:last-child') as HTMLElement
            if (textDiv) {
              textDiv.style.display = 'block'
            }
            // You can add more interaction logic here
          })

          console.log('Label placed at:', sphere.position)

          // Call the callback if provided
          onFileAttached?.(selectedFile, sphere.position)
        }
        else {
          console.warn('Invalid hit point detected:', result.point)
        }

        // Clean up after placing
        onCancel()
      }
      else {
        console.log('No raycast result')
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)

    // Cleanup function to remove the icon and event listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      if (document.body.contains(fileIcon)) {
        fileIcon.remove()
      }
      // Revoke object URL if it was created for an image
      if (isImage) {
        const img = fileIcon.querySelector('img')
        if (img) {
          URL.revokeObjectURL(img.src)
        }
      }
    }
  }, [selectedFile, world, fragments, onCancel, onFileAttached])

  return null // This component doesn't render anything visible
};
