import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getPawnTargetId } from './boardConfig.jsx'

const STACK_OFFSETS = [
  { x: 0, y: 0 },
  { x: -8, y: -8 },
  { x: 8, y: -8 },
  { x: 0, y: 8 },
]

export const useBoardTargets = (pawns) => {
  const boardRef = useRef(null)
  const targetRefs = useRef({})
  const [pawnPositions, setPawnPositions] = useState({})

  const pawnSignature = useMemo(
    () => pawns.map((pawn) => `${pawn.id}:${pawn.progress}`).join('|'),
    [pawns],
  )

  const registerTarget = (targetId) => (node) => {
    if (node) {
      targetRefs.current[targetId] = node
      return
    }

    delete targetRefs.current[targetId]
  }

  const updatePawnPositions = () => {
    const boardNode = boardRef.current

    if (!boardNode) {
      return
    }

    const boardRect = boardNode.getBoundingClientRect()
    const groupedByTarget = new Map()

    pawns.forEach((pawn) => {
      const targetId = getPawnTargetId(pawn)
      const group = groupedByTarget.get(targetId) ?? []
      group.push({ ...pawn, targetId })
      groupedByTarget.set(targetId, group)
    })

    const nextPositions = {}

    groupedByTarget.forEach((group, targetId) => {
      const targetNode = targetRefs.current[targetId]

      if (!targetNode) {
        return
      }

      const targetRect = targetNode.getBoundingClientRect()
      const centerLeft = targetRect.left - boardRect.left + targetRect.width / 2
      const centerTop = targetRect.top - boardRect.top + targetRect.height / 2

      group.forEach((pawn, index) => {
        const offset =
          group.length === 1
            ? { x: 0, y: 0 }
            : (STACK_OFFSETS[index] ?? STACK_OFFSETS[0])

        nextPositions[pawn.id] = {
          left: centerLeft + offset.x,
          top: centerTop + offset.y,
        }
      })
    })

    setPawnPositions((currentPositions) => {
      const currentSignature = JSON.stringify(currentPositions)
      const nextSignature = JSON.stringify(nextPositions)
      return currentSignature === nextSignature
        ? currentPositions
        : nextPositions
    })
  }

  useLayoutEffect(() => {
    updatePawnPositions()

    const animationFrame = window.requestAnimationFrame(updatePawnPositions)
    window.addEventListener('resize', updatePawnPositions)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', updatePawnPositions)
    }
  }, [pawnSignature])

  useEffect(() => {
    const boardNode = boardRef.current

    if (!boardNode) {
      return undefined
    }

    const handleAnimationEnd = () => updatePawnPositions()
    boardNode.addEventListener('animationend', handleAnimationEnd)

    return () => {
      boardNode.removeEventListener('animationend', handleAnimationEnd)
    }
  }, [pawnSignature])

  return {
    boardRef,
    pawnPositions,
    registerTarget,
  }
}
