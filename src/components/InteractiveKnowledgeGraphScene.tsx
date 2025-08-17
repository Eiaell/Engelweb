'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useInteractableObject, useInteractionPattern } from '@/hooks/useInteractionManager';
import { useSceneInteraction } from '@/contexts/InteractionContext';
import {
  InteractableObject,
  KnowledgeGraphInteraction,
  Command,
  ClusterData,
  PathfindingData
} from '@/types/interactions';

interface InteractiveKnowledgeGraphSceneProps {
  scrollProgress: number;
}

// Node types with Fortune 500-level semantic clustering
const nodeTypeDefinitions = [
  { 
    type: 'CORE' as const, 
    color: '#FF6B6B', 
    size: 2.5, 
    count: 4,
    businessCriticality: 'critical',
    semanticWeight: 1.0,
    centralityScore: 0.95,
    connectivity: 'hub'
  },
  { 
    type: 'ENTITY' as const, 
    color: '#4ECDC4', 
    size: 1.8, 
    count: 12,
    businessCriticality: 'high',
    semanticWeight: 0.8,
    centralityScore: 0.7,
    connectivity: 'connector'
  },
  { 
    type: 'PROCESS' as const, 
    color: '#45B7D1', 
    size: 1.5, 
    count: 8,
    businessCriticality: 'medium',
    semanticWeight: 0.6,
    centralityScore: 0.5,
    connectivity: 'bridge'
  },
  { 
    type: 'RELATION' as const, 
    color: '#F9CA24', 
    size: 1.2, 
    count: 16,
    businessCriticality: 'medium',
    semanticWeight: 0.4,
    centralityScore: 0.3,
    connectivity: 'leaf'
  }
] as const;

// Relationship types for enterprise knowledge graphs
const relationshipTypes = [
  { type: 'hierarchical', color: '#10B981', strength: 0.9, label: 'PARENT_OF' },
  { type: 'causal', color: '#F59E0B', strength: 0.8, label: 'CAUSES' },
  { type: 'semantic', color: '#8B5CF6', strength: 0.7, label: 'RELATED_TO' },
  { type: 'temporal', color: '#06B6D4', strength: 0.6, label: 'FOLLOWS' },
  { type: 'compositional', color: '#84CC16', strength: 0.5, label: 'CONTAINS' }
] as const;

const InteractiveKnowledgeGraphScene: React.FC<InteractiveKnowledgeGraphSceneProps> = ({ 
  scrollProgress 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [pathfindingMode, setPathfindingMode] = useState(false);
  const [pathfindingNodes, setPathfindingNodes] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null
  });
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [clusterView, setClusterView] = useState(false);
  const [filterState, setFilterState] = useState({
    nodeTypes: new Set<string>(),
    relationshipTypes: new Set<string>(),
    centralityThreshold: 0.0,
    businessCriticality: 'all' as 'all' | 'critical' | 'high' | 'medium' | 'low'
  });
  const [graphMetrics, setGraphMetrics] = useState({
    density: 0,
    clustering: 0,
    avgPathLength: 0,
    centrality: new Map<string, number>()
  });

  // Scene interaction management
  const {
    activateScene,
    deactivateScene,
    selectInScene,
    isSceneActive,
    sceneSelections
  } = useSceneInteraction('knowledge-graph');

  // Compatibility matrix for node types
  const getTypeCompatibility = useCallback((typeA: string, typeB: string): number => {
    const compatibilityMatrix: Record<string, Record<string, number>> = {
      'CORE': { 'CORE': 0.9, 'ENTITY': 0.8, 'PROCESS': 0.7, 'RELATION': 0.5 },
      'ENTITY': { 'CORE': 0.8, 'ENTITY': 0.6, 'PROCESS': 0.9, 'RELATION': 0.7 },
      'PROCESS': { 'CORE': 0.7, 'ENTITY': 0.9, 'PROCESS': 0.5, 'RELATION': 0.8 },
      'RELATION': { 'CORE': 0.5, 'ENTITY': 0.7, 'PROCESS': 0.8, 'RELATION': 0.3 }
    };
    return compatibilityMatrix[typeA]?.[typeB] || 0.1;
  }, []);

  // Generate knowledge graph nodes with enhanced metadata
  const graphNodes = useMemo(() => {
    const nodes: { id: number; type: string; position: [number, number, number]; color: string; size: number; metadata: Record<string, unknown> }[] = [];
    let nodeId = 0;
    
    nodeTypeDefinitions.forEach((nodeType, typeIndex) => {
      for (let i = 0; i < nodeType.count; i++) {
        // Spherical distribution for organic graph layout
        const phi = Math.acos(-1 + (2 * (nodeId + i)) / 40); // Total nodes
        const theta = Math.sqrt(40 * Math.PI) * phi;
        
        const radius = 8 + typeIndex * 3 + Math.random() * 4;
        
        const node = {
          id: `node-${nodeType.type}-${i}`,
          type: nodeType.type,
          color: nodeType.color,
          size: nodeType.size,
          businessCriticality: nodeType.businessCriticality,
          semanticWeight: nodeType.semanticWeight + (Math.random() - 0.5) * 0.2,
          centralityScore: nodeType.centralityScore + (Math.random() - 0.5) * 0.3,
          connectivity: nodeType.connectivity,
          position: new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta), 
            radius * Math.cos(phi)
          ),
          connections: [] as string[],
          pulse: Math.random() * Math.PI * 2,
          // Enhanced metadata
          metadata: {
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            accessCount: Math.floor(Math.random() * 100),
            updateFrequency: Math.random(),
            confidence: 0.7 + Math.random() * 0.3,
            dataSource: ['CRM', 'ERP', 'DOCS', 'EMAIL'][Math.floor(Math.random() * 4)],
            businessUnit: ['Sales', 'Marketing', 'Operations', 'Finance'][Math.floor(Math.random() * 4)],
            tags: [],
            attributes: new Map()
          },
          // Clustering data
          clusterData: {
            clusterId: `cluster-${Math.floor(nodeId / 5)}`,
            clusterType: nodeType.type,
            members: [] as string[],
            centroid: new THREE.Vector3(),
            cohesion: Math.random()
          }
        };
        
        nodes.push(node);
        nodeId++;
      }
    });

    // Generate connections based on business logic and semantic similarity
    nodes.forEach((node, index) => {
      const maxConnections = 
        node.type === 'CORE' ? 8 : 
        node.type === 'ENTITY' ? 5 : 
        node.type === 'PROCESS' ? 3 : 2;
      
      const connectionCandidates = nodes
        .filter((other, otherIndex) => otherIndex !== index)
        .map((other, otherIndex) => ({
          ...other,
          originalIndex: otherIndex < index ? otherIndex : otherIndex + 1,
          distance: node.position.distanceTo(other.position),
          semanticSimilarity: Math.abs(node.semanticWeight - other.semanticWeight),
          businessAlignment: node.metadata.businessUnit === other.metadata.businessUnit ? 0.5 : 0,
          typeCompatibility: getTypeCompatibility(node.type, other.type)
        }))
        .sort((a, b) => {
          // Multi-criteria sorting: distance, semantic similarity, business alignment
          const scoreA = a.distance * 0.3 + a.semanticSimilarity * 0.4 + (1 - a.businessAlignment) * 0.2 + (1 - a.typeCompatibility) * 0.1;
          const scoreB = b.distance * 0.3 + b.semanticSimilarity * 0.4 + (1 - b.businessAlignment) * 0.2 + (1 - b.typeCompatibility) * 0.1;
          return scoreA - scoreB;
        })
        .slice(0, maxConnections);

      node.connections = connectionCandidates.map(candidate => candidate.originalIndex);
    });

    return nodes;
  }, [getTypeCompatibility]);

  // Generate connection lines with relationship metadata
  const connections = useMemo(() => {
    const lines: { from: [number, number, number]; to: [number, number, number]; strength: number; color: string }[] = [];
    graphNodes.forEach((node, index) => {
      node.connections.forEach((connectionIndex: number) => {
        if (connectionIndex > index) { // Avoid duplicate lines
          const connectedNode = graphNodes[connectionIndex];
          const relationshipType = relationshipTypes[
            Math.floor(Math.random() * relationshipTypes.length)
          ];
          
          lines.push({
            id: `connection-${node.id}-${connectedNode.id}`,
            from: node.position,
            to: connectedNode.position,
            fromNode: node.id,
            toNode: connectedNode.id,
            fromType: node.type,
            toType: connectedNode.type,
            relationshipType: relationshipType.type,
            strength: relationshipType.strength * (0.5 + Math.random() * 0.5),
            color: relationshipType.color,
            label: relationshipType.label,
            weight: 1 / (1 + node.position.distanceTo(connectedNode.position) * 0.1),
            metadata: {
              confidence: 0.6 + Math.random() * 0.4,
              establishedAt: new Date().toISOString(),
              validatedBy: 'system',
              businessRelevance: Math.random()
            }
          });
        }
      });
    });
    return lines;
  }, [graphNodes]);

  // Interactive objects for each node
  const nodeInteractables = useMemo(() => {
    return graphNodes.map(node => ({
      ...node,
      interactionData: {
        id: node.id,
        type: 'knowledge-node',
        metadata: {
          nodeType: node.type,
          centralityScore: node.centralityScore,
          businessCriticality: node.businessCriticality,
          semanticWeight: node.semanticWeight,
          clusterData: node.clusterData,
          ...node.metadata
        },
        state: 'idle' as const,
        capabilities: ['draggable', 'selectable', 'inspectable', 'connectable', 'expandable', 'traceable'],
        accessibility: {
          label: `${node.type} node - Centrality ${(node.centralityScore * 100).toFixed(0)}%`,
          description: `Knowledge graph ${node.type.toLowerCase()} node with ${node.connections.length} connections`,
          role: 'button',
          keyboardShortcuts: [
            'Enter to select', 
            'Space to expand', 
            'F to find paths',
            'C to view cluster',
            'E to explore connections'
          ],
          announcements: [`${node.type} node with ${node.connections.length} connections`]
        }
      } as InteractableObject['interactionData']
    }));
  }, [graphNodes]);

  // Scene activation based on scroll progress
  useEffect(() => {
    const sectionStart = 0.60; // Starts after text appears
    const sectionEnd = 0.80;
    const isInSection = scrollProgress >= sectionStart && scrollProgress <= sectionEnd;
    
    if (isInSection && !isSceneActive) {
      activateScene();
    } else if (!isInSection && isSceneActive) {
      deactivateScene();
    }
  }, [scrollProgress, isSceneActive, activateScene, deactivateScene]);

  // Enhanced interaction handlers
  const handleNodeHover = useCallback((nodeId: string, enter: boolean) => {
    setHoveredNode(enter ? nodeId : null);
    
    const node = graphNodes.find(n => n.id === nodeId);
    if (node && groupRef.current) {
      const nodeMesh = groupRef.current.getObjectByName(nodeId);
      if (nodeMesh) {
        gsap.to(nodeMesh.scale, {
          duration: 0.15,
          x: enter ? 1.4 : 1,
          y: enter ? 1.4 : 1,
          z: enter ? 1.4 : 1,
          ease: 'back.out(1.7)'
        });
        
        // Highlight connected nodes
        if (enter) {
          node.connections.forEach((connectedIndex: number) => {
            const connectedNode = graphNodes[connectedIndex];
            const connectedMesh = groupRef.current?.getObjectByName(connectedNode.id);
            if (connectedMesh) {
              gsap.to(connectedMesh.material, {
                duration: 0.2,
                opacity: 1,
                ease: 'power2.out'
              });
            }
          });
        }
      }
    }
  }, [graphNodes]);

  const handleNodeSelect = useCallback((nodeId: string, multiSelect: boolean = false) => {
    setSelectedNodes(prev => {
      const newSelection = new Set(prev);
      
      if (!multiSelect) {
        newSelection.clear();
      }
      
      if (newSelection.has(nodeId)) {
        newSelection.delete(nodeId);
      } else {
        newSelection.add(nodeId);
      }
      
      selectInScene(nodeId, multiSelect);
      return newSelection;
    });
  }, [selectInScene]);

  const handleNodeExpand = useCallback((nodeId: string) => {
    const node = graphNodes.find(n => n.id === nodeId);
    if (node) {
      console.log('🔍 Expanding node:', {
        id: nodeId,
        type: node.type,
        connections: node.connections.length,
        centralityScore: node.centralityScore,
        businessCriticality: node.businessCriticality,
        metadata: node.metadata
      });
      
      // Could trigger detailed node view or expand connections
      setClusterView(true);
    }
  }, [graphNodes]);

  const handlePathfinding = useCallback((nodeId: string) => {
    if (!pathfindingMode) {
      setPathfindingMode(true);
      setPathfindingNodes({ start: nodeId, end: null });
    } else if (!pathfindingNodes.end && pathfindingNodes.start !== nodeId) {
      setPathfindingNodes(prev => ({ ...prev, end: nodeId }));
      
      // Calculate shortest path using Dijkstra's algorithm
      const path = findShortestPath(pathfindingNodes.start!, nodeId);
      setCurrentPath(path);
      
      console.log('🗺️ Path found:', {
        start: pathfindingNodes.start,
        end: nodeId,
        path: path,
        length: path.length
      });
    } else {
      // Reset pathfinding
      setPathfindingMode(false);
      setPathfindingNodes({ start: null, end: null });
      setCurrentPath([]);
    }
  }, [pathfindingMode, pathfindingNodes, graphNodes]);

  const findShortestPath = useCallback((startId: string, endId: string): string[] => {
    // Simplified Dijkstra's algorithm for demonstration
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();
    
    // Initialize
    graphNodes.forEach(node => {
      distances.set(node.id, node.id === startId ? 0 : Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    });
    
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      const currentNode = Array.from(unvisited).reduce((min, nodeId) => 
        (distances.get(nodeId)! < distances.get(min)!) ? nodeId : min
      );
      
      if (currentNode === endId) break;
      
      unvisited.delete(currentNode);
      
      const current = graphNodes.find(n => n.id === currentNode)!;
      current.connections.forEach((connectedIndex: number) => {
        const connectedNode = graphNodes[connectedIndex];
        if (unvisited.has(connectedNode.id)) {
          const alt = distances.get(currentNode)! + 1; // Edge weight = 1
          if (alt < distances.get(connectedNode.id)!) {
            distances.set(connectedNode.id, alt);
            previous.set(connectedNode.id, currentNode);
          }
        }
      });
    }
    
    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endId;
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current)!;
    }
    
    return path.length > 1 ? path : [];
  }, [graphNodes]);

  const handleNodeContextMenu = useCallback((nodeId: string) => {
    const node = graphNodes.find(n => n.id === nodeId);
    if (node) {
      console.log('📋 Node context menu:', {
        node: nodeId,
        actions: [
          'Inspect details',
          'Find shortest path',
          'View cluster',
          'Show all connections',
          'Export subgraph',
          'Update metadata',
          'Create relationship',
          'Set as bookmark'
        ]
      });
    }
  }, [graphNodes]);

  // Filter handling
  const applyFilter = useCallback((newFilter: Partial<typeof filterState>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);

  const shouldShowNode = useCallback((node: { type: string; metadata: Record<string, unknown> }) => {
    if (filterState.nodeTypes.size > 0 && !filterState.nodeTypes.has(node.type)) {
      return false;
    }
    
    if (node.centralityScore < filterState.centralityThreshold) {
      return false;
    }
    
    if (filterState.businessCriticality !== 'all' && 
        node.businessCriticality !== filterState.businessCriticality) {
      return false;
    }
    
    return true;
  }, [filterState]);

  // Calculate graph metrics
  useEffect(() => {
    const visibleNodes = graphNodes.filter(shouldShowNode);
    const visibleConnections = connections.filter(conn => 
      visibleNodes.some(n => n.id === conn.fromNode) && 
      visibleNodes.some(n => n.id === conn.toNode)
    );
    
    const density = visibleConnections.length / (visibleNodes.length * (visibleNodes.length - 1) / 2);
    
    setGraphMetrics({
      density,
      clustering: 0.6 + Math.random() * 0.3, // Simplified
      avgPathLength: 2.5 + Math.random() * 1.5, // Simplified
      centrality: new Map(visibleNodes.map(n => [n.id, n.centralityScore]))
    });
  }, [graphNodes, connections, shouldShowNode]);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const sectionStart = 0.60;
    const sectionEnd = 0.80;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));

    // Animate graph formation
    graphNodes.forEach((node, index) => {
      const nodeMesh = groupRef.current?.getObjectByName(node.id);
      if (!nodeMesh) return;

      // Show/hide based on filters
      const shouldShow = shouldShowNode(node);
      nodeMesh.visible = shouldShow;
      
      if (!shouldShow) return;

      // Nodes appear progressively
      const nodeProgress = Math.min(1, Math.max(0, (localProgress - index * 0.02) / 0.8));
      
      if (nodeProgress > 0) {
        // Scale animation
        const baseScale = nodeProgress * node.size;
        if (!selectedNodes.has(node.id) && hoveredNode !== node.id) {
          nodeMesh.scale.setScalar(baseScale);
        }
        
        // Floating motion
        const originalY = node.position.y;
        nodeMesh.position.y = originalY + Math.sin(time * 0.8 + node.pulse) * 0.5;
        
        // Pulsing brightness for core nodes
        if (node.type === 'CORE') {
          const pulseIntensity = 0.8 + Math.sin(time * 2 + node.pulse) * 0.3;
          if (nodeMesh.material) {
            nodeMesh.material.opacity = Math.min(1, nodeProgress * pulseIntensity);
          }
          
          // Rotation for core nodes
          nodeMesh.rotation.y = time * 0.3;
          nodeMesh.rotation.x = time * 0.2;
        }
        
        // Selection effects
        if (selectedNodes.has(node.id)) {
          const pulseScale = 1.2 + Math.sin(time * 3) * 0.1;
          nodeMesh.scale.setScalar(baseScale * pulseScale);
        }
        
        // Pathfinding highlights
        if (currentPath.includes(node.id)) {
          const pathHighlight = 1.3 + Math.sin(time * 4) * 0.2;
          nodeMesh.scale.setScalar(baseScale * pathHighlight);
        }
      }
    });
    
    // Rotate entire graph slowly
    if (groupRef.current && !clusterView) {
      groupRef.current.rotation.y = time * 0.05;
    }
  });

  // Show only during knowledge graph section
  const sectionStart = 0.60;
  const sectionEnd = 0.80;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef}>
      {/* Graph nodes */}
      {nodeInteractables.map((node, index) => (
        <group 
          key={node.id}
          name={node.id}
          position={node.position}
          onPointerEnter={() => handleNodeHover(node.id, true)}
          onPointerLeave={() => handleNodeHover(node.id, false)}
          onClick={(e) => {
            e.stopPropagation();
            if (pathfindingMode) {
              handlePathfinding(node.id);
            } else {
              handleNodeSelect(node.id, e.nativeEvent.ctrlKey);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleNodeExpand(node.id);
          }}
          onContextMenu={(e) => {
            e.stopPropagation();
            handleNodeContextMenu(node.id);
          }}
        >
          {/* Main node sphere */}
          <mesh>
            <sphereGeometry args={[node.size, 12, 12]} />
            <meshBasicMaterial 
              color={node.color}
              transparent
              opacity={0.8}
            />
          </mesh>
          
          {/* Node glow */}
          <mesh>
            <sphereGeometry args={[node.size * 1.3, 8, 8]} />
            <meshBasicMaterial 
              color={node.color}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          
          {/* Business criticality indicator */}
          <mesh position={[0, node.size + 0.5, 0]}>
            <coneGeometry args={[0.3, 0.8, 4]} />
            <meshBasicMaterial
              color={
                node.businessCriticality === 'critical' ? '#EF4444' :
                node.businessCriticality === 'high' ? '#F59E0B' :
                node.businessCriticality === 'medium' ? '#10B981' : '#6B7280'
              }
              transparent
              opacity={0.8}
            />
          </mesh>
          
          {/* Centrality score indicator */}
          <mesh position={[0, -node.size - 0.3, 0]}>
            <cylinderGeometry args={[0.1, 0.1, node.centralityScore * 2, 6]} />
            <meshBasicMaterial
              color="#00FFFF"
              transparent
              opacity={0.7}
            />
          </mesh>
          
          {/* Node type label for core nodes */}
          {node.type === 'CORE' && (
            <Text
              text={`CORE ${node.id.split('-')[2]}`}
              fontSize={0.6}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              position={[0, 0, node.size + 0.5]}
            >
              <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
            </Text>
          )}
          
          {/* Selection indicator */}
          {selectedNodes.has(node.id) && (
            <mesh>
              <ringGeometry args={[node.size * 1.5, node.size * 1.8, 16]} />
              <meshBasicMaterial
                color="#00FFFF"
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          
          {/* Pathfinding indicators */}
          {pathfindingNodes.start === node.id && (
            <Text
              text="START"
              fontSize={0.4}
              color="#00FF00"
              anchorX="center"
              anchorY="middle"
              position={[0, node.size + 1.5, 0]}
            >
              <meshBasicMaterial color="#00FF00" toneMapped={false} />
            </Text>
          )}
          
          {pathfindingNodes.end === node.id && (
            <Text
              text="END"
              fontSize={0.4}
              color="#FF0000"
              anchorX="center"
              anchorY="middle"
              position={[0, node.size + 1.5, 0]}
            >
              <meshBasicMaterial color="#FF0000" toneMapped={false} />
            </Text>
          )}
          
          {/* Path highlight */}
          {currentPath.includes(node.id) && (
            <mesh>
              <sphereGeometry args={[node.size * 1.6, 8, 8]} />
              <meshBasicMaterial
                color="#FFFF00"
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Connection lines */}
      {connections.map((connection, index) => {
        const shouldShowConnection = 
          shouldShowNode(graphNodes.find(n => n.id === connection.fromNode)) &&
          shouldShowNode(graphNodes.find(n => n.id === connection.toNode));
          
        if (!shouldShowConnection) return null;
        
        const midpoint = new THREE.Vector3().addVectors(connection.from, connection.to).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(connection.to, connection.from);
        const distance = direction.length();
        
        const isPathConnection = currentPath.length > 1 && 
          currentPath.some((nodeId, i) => 
            i < currentPath.length - 1 && 
            ((currentPath[i] === connection.fromNode && currentPath[i + 1] === connection.toNode) ||
             (currentPath[i] === connection.toNode && currentPath[i + 1] === connection.fromNode))
          );
        
        return (
          <group key={connection.id}>
            <mesh position={midpoint} lookAt={connection.to}>
              <cylinderGeometry args={[0.02, 0.02, distance, 6]} />
              <meshBasicMaterial 
                color={isPathConnection ? '#FFFF00' : connection.color}
                transparent
                opacity={isPathConnection ? 0.8 : 0.3}
              />
            </mesh>
            
            {/* Connection strength indicator */}
            <mesh position={midpoint}>
              <sphereGeometry args={[0.05 * connection.strength, 4, 4]} />
              <meshBasicMaterial 
                color={connection.color}
                transparent
                opacity={0.6}
              />
            </mesh>
            
            {/* Relationship type label (on hover) */}
            {(hoveredNode === connection.fromNode || hoveredNode === connection.toNode) && (
              <Text
                text={connection.label}
                fontSize={0.3}
                color="#FFFFFF"
                anchorX="center"
                anchorY="middle"
                position={[midpoint.x, midpoint.y + 1, midpoint.z]}
              >
                <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
              </Text>
            )}
          </group>
        );
      })}

      {/* Central knowledge core */}
      <group position={[0, 0, 0]}>
        <mesh ref={coreRef}>
          <octahedronGeometry args={[3]} />
          <meshBasicMaterial 
            color="#FF6B6B"
            transparent
            opacity={0.1}
            wireframe
          />
        </mesh>
        
        <Text
          text="KNOWLEDGE GRAPH"
          fontSize={1.8}
          color="#FF6B6B"
          anchorX="center"
          anchorY="middle"
          position={[0, 8, 0]}
        >
          <meshBasicMaterial color="#FF6B6B" toneMapped={false} />
        </Text>
      </group>

      {/* Graph metrics display */}
      <group position={[-15, 10, 0]}>
        <Text
          text={`DENSIDAD: ${(graphMetrics.density * 100).toFixed(1)}%`}
          fontSize={0.6}
          color="#00FFFF"
          anchorX="left"
          anchorY="middle"
          position={[0, 2, 0]}
        >
          <meshBasicMaterial color="#00FFFF" toneMapped={false} />
        </Text>
        
        <Text
          text={`CLUSTERING: ${(graphMetrics.clustering * 100).toFixed(1)}%`}
          fontSize={0.6}
          color="#00FFFF"
          anchorX="left"
          anchorY="middle"
          position={[0, 1, 0]}
        >
          <meshBasicMaterial color="#00FFFF" toneMapped={false} />
        </Text>
        
        <Text
          text={`NODOS: ${graphNodes.filter(shouldShowNode).length}`}
          fontSize={0.6}
          color="#00FFFF"
          anchorX="left"
          anchorY="middle"
          position={[0, 0, 0]}
        >
          <meshBasicMaterial color="#00FFFF" toneMapped={false} />
        </Text>
      </group>

      {/* Pathfinding controls */}
      {pathfindingMode && (
        <group position={[15, 10, 0]}>
          <Text
            text="MODO PATHFINDING"
            fontSize={0.8}
            color="#FFFF00"
            anchorX="center"
            anchorY="middle"
            position={[0, 2, 0]}
          >
            <meshBasicMaterial color="#FFFF00" toneMapped={false} />
          </Text>
          
          {pathfindingNodes.start && (
            <Text
              text={`INICIO: ${pathfindingNodes.start}`}
              fontSize={0.5}
              color="#00FF00"
              anchorX="center"
              anchorY="middle"
              position={[0, 1, 0]}
            >
              <meshBasicMaterial color="#00FF00" toneMapped={false} />
            </Text>
          )}
          
          {currentPath.length > 0 && (
            <Text
              text={`DISTANCIA: ${currentPath.length - 1} saltos`}
              fontSize={0.5}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              position={[0, 0, 0]}
            >
              <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
            </Text>
          )}
        </group>
      )}

      {/* Selection info */}
      {selectedNodes.size > 0 && (
        <Text
          text={`${selectedNodes.size} NODO${selectedNodes.size > 1 ? 'S' : ''} SELECCIONADO${selectedNodes.size > 1 ? 'S' : ''}`}
          fontSize={0.6}
          color="#00FF00"
          anchorX="center"
          anchorY="middle"
          position={[0, 6, 0]}
        >
          <meshBasicMaterial color="#00FF00" toneMapped={false} />
        </Text>
      )}

      {/* Filter indicator */}
      {(filterState.nodeTypes.size > 0 || 
        filterState.relationshipTypes.size > 0 ||
        filterState.centralityThreshold > 0 ||
        filterState.businessCriticality !== 'all') && (
        <Text
          text="FILTROS ACTIVOS"
          fontSize={0.6}
          color="#F59E0B"
          anchorX="center"
          anchorY="middle"
          position={[0, 4, 0]}
        >
          <meshBasicMaterial color="#F59E0B" toneMapped={false} />
        </Text>
      )}

      {/* Cluster view indicator */}
      {clusterView && (
        <Text
          text="VISTA DE CLUSTERS"
          fontSize={0.8}
          color="#8B5CF6"
          anchorX="center"
          anchorY="middle"
          position={[0, 12, 0]}
        >
          <meshBasicMaterial color="#8B5CF6" toneMapped={false} />
        </Text>
      )}
    </group>
  );
};

export default InteractiveKnowledgeGraphScene;