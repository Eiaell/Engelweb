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
  EntityExtractionInteraction,
  Command
} from '@/types/interactions';

interface InteractiveEntityExtractionSceneProps {
  scrollProgress: number;
}

// Entity types with Fortune 500-level metadata
const entityTypeDefinitions = [
  {
    type: 'PERSONAS' as const,
    icon: '👤',
    color: '#3B82F6',
    symbol: 'PERSON',
    count: 12,
    priority: 'high',
    extractionRules: ['Named entities', 'Job titles', 'Departments', 'Contact info'],
    confidence: 0.94,
    businessValue: 'critical'
  },
  {
    type: 'PROCESOS' as const,
    icon: '⚙️',
    color: '#10B981',
    symbol: 'PROCESS',
    count: 8,
    priority: 'critical',
    extractionRules: ['Workflow steps', 'Procedures', 'Methods', 'Operations'],
    confidence: 0.89,
    businessValue: 'high'
  },
  {
    type: 'RELACIONES' as const,
    icon: '🔗',
    color: '#F59E0B',
    symbol: 'RELATION',
    count: 15,
    priority: 'medium',
    extractionRules: ['Dependencies', 'Hierarchies', 'Interactions', 'Connections'],
    confidence: 0.87,
    businessValue: 'high'
  },
  {
    type: 'CONCEPTOS' as const,
    icon: '💡',
    color: '#8B5CF6',
    symbol: 'CONCEPT',
    count: 10,
    priority: 'medium',
    extractionRules: ['Definitions', 'Terminology', 'Standards', 'Policies'],
    confidence: 0.91,
    businessValue: 'medium'
  }
] as const;

const validationStates = [
  { state: 'pending', color: '#6B7280', label: 'PENDING' },
  { state: 'validated', color: '#10B981', label: 'VALIDATED' },
  { state: 'rejected', color: '#EF4444', label: 'REJECTED' },
  { state: 'merged', color: '#8B5CF6', label: 'MERGED' }
] as const;

const InteractiveEntityExtractionScene: React.FC<InteractiveEntityExtractionSceneProps> = ({ 
  scrollProgress 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const extractionCoreRef = useRef<THREE.Mesh>(null);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [draggedEntity, setDraggedEntity] = useState<string | null>(null);
  const [filterState, setFilterState] = useState({
    entityTypes: new Set<string>(),
    validationStates: new Set<string>(),
    confidenceThreshold: 0.5,
    businessValueFilter: 'all' as 'all' | 'critical' | 'high' | 'medium' | 'low'
  });
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [validationMode, setValidationMode] = useState(false);

  // Scene interaction management
  const {
    activateScene,
    deactivateScene,
    selectInScene,
    isSceneActive,
    sceneSelections
  } = useSceneInteraction('entity-extraction');

  // Generate entities with enhanced metadata
  const extractedEntities = useMemo(() => {
    const entities: any[] = [];
    
    entityTypeDefinitions.forEach((entityDef, typeIndex) => {
      for (let i = 0; i < entityDef.count; i++) {
        const entityId = `entity-${entityDef.type}-${i}`;
        const angle = (i / entityDef.count) * Math.PI * 2;
        const startRadius = 2 + Math.random() * 3;
        const endRadius = 12 + typeIndex * 4;
        
        // Final positions - categorized by type
        const finalAngle = (typeIndex / entityTypeDefinitions.length) * Math.PI * 2 + 
                          (i / entityDef.count) * Math.PI * 0.5;
        
        entities.push({
          id: entityId,
          type: entityDef.type,
          icon: entityDef.icon,
          color: entityDef.color,
          symbol: entityDef.symbol,
          confidence: entityDef.confidence + (Math.random() - 0.5) * 0.1,
          priority: entityDef.priority,
          businessValue: entityDef.businessValue,
          extractionRules: entityDef.extractionRules,
          validationState: validationStates[Math.floor(Math.random() * validationStates.length)].state,
          // Enhanced metadata
          metadata: {
            extractedAt: new Date().toISOString(),
            sourceDocument: `doc_${Math.floor(Math.random() * 100)}`,
            extractionMethod: 'NLP_ML_HYBRID',
            reviewedBy: null,
            lastModified: new Date().toISOString(),
            relationships: []
          },
          // Positions
          startPos: new THREE.Vector3(
            Math.cos(angle) * startRadius,
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * startRadius
          ),
          endPos: new THREE.Vector3(
            Math.cos(finalAngle) * endRadius,
            2 + typeIndex * 2,
            Math.sin(finalAngle) * endRadius
          ),
          currentPos: new THREE.Vector3(
            Math.cos(angle) * startRadius,
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * startRadius
          ),
          delay: i * 0.1 + typeIndex * 0.3,
          isExtracted: false,
          extractionProgress: 0
        });
      }
    });
    
    return entities;
  }, []);

  // Interactive objects for each entity
  const entityInteractables = useMemo(() => {
    return extractedEntities.map(entity => ({
      ...entity,
      interactionData: {
        id: entity.id,
        type: 'extracted-entity',
        metadata: {
          entityType: entity.type,
          confidence: entity.confidence,
          validationState: entity.validationState,
          businessValue: entity.businessValue,
          ...entity.metadata
        },
        state: 'idle' as const,
        capabilities: ['draggable', 'selectable', 'inspectable', 'mergeable', 'validatable'],
        accessibility: {
          label: `${entity.type} entity - Confidence ${(entity.confidence * 100).toFixed(0)}%`,
          description: `Extracted ${entity.type.toLowerCase()} entity with ${entity.validationState} validation status`,
          role: 'button',
          keyboardShortcuts: [
            'Enter to select', 
            'Space to inspect', 
            'V to validate', 
            'R to reject',
            'M to merge with selected'
          ],
          announcements: [`${entity.type} entity extracted with ${entity.validationState} status`]
        }
      } as InteractableObject['interactionData']
    }));
  }, [extractedEntities]);

  // Scene activation based on scroll progress
  useEffect(() => {
    const sectionStart = 0.40; // Starts after text appears
    const sectionEnd = 0.60;
    const isInSection = scrollProgress >= sectionStart && scrollProgress <= sectionEnd;
    
    if (isInSection && !isSceneActive) {
      activateScene();
    } else if (!isInSection && isSceneActive) {
      deactivateScene();
    }
  }, [scrollProgress, isSceneActive, activateScene, deactivateScene]);

  // Enhanced interaction handlers
  const handleEntityHover = useCallback((entityId: string, enter: boolean) => {
    setHoveredEntity(enter ? entityId : null);
    
    // Visual feedback with GSAP
    const entity = extractedEntities.find(e => e.id === entityId);
    if (entity && groupRef.current) {
      const entityMesh = groupRef.current.getObjectByName(entityId);
      if (entityMesh) {
        gsap.to(entityMesh.scale, {
          duration: 0.15,
          x: enter ? 1.3 : 1,
          y: enter ? 1.3 : 1,
          z: enter ? 1.3 : 1,
          ease: 'back.out(1.7)'
        });
        
        // Glow effect
        if (enter) {
          gsap.to(entityMesh.material, {
            duration: 0.2,
            opacity: 1,
            ease: 'power2.out'
          });
        }
      }
    }
  }, [extractedEntities]);

  const handleEntitySelect = useCallback((entityId: string, multiSelect: boolean = false) => {
    setSelectedEntities(prev => {
      const newSelection = new Set(prev);
      
      if (!multiSelect) {
        newSelection.clear();
      }
      
      if (newSelection.has(entityId)) {
        newSelection.delete(entityId);
      } else {
        newSelection.add(entityId);
      }
      
      selectInScene(entityId, multiSelect);
      return newSelection;
    });
  }, [selectInScene]);

  const handleEntityValidate = useCallback((entityId: string, validationState: 'validated' | 'rejected') => {
    const entity = extractedEntities.find(e => e.id === entityId);
    if (entity && groupRef.current) {
      entity.validationState = validationState;
      entity.metadata.reviewedBy = 'user';
      entity.metadata.lastModified = new Date().toISOString();
      
      const entityMesh = groupRef.current.getObjectByName(entityId);
      if (entityMesh) {
        // Visual feedback
        const newColor = validationState === 'validated' ? '#10B981' : '#EF4444';
        gsap.to(entityMesh.material, {
          duration: 0.5,
          color: newColor,
          ease: 'power2.out'
        });
        
        // Success animation
        gsap.fromTo(entityMesh.scale, 
          { x: 1, y: 1, z: 1 },
          { 
            x: 1.5, y: 1.5, z: 1.5, 
            duration: 0.3, 
            ease: 'back.out(2)',
            yoyo: true,
            repeat: 1
          }
        );
      }
    }
  }, [extractedEntities]);

  const handleEntityMerge = useCallback((sourceEntityId: string, targetEntityId: string) => {
    const sourceEntity = extractedEntities.find(e => e.id === sourceEntityId);
    const targetEntity = extractedEntities.find(e => e.id === targetEntityId);
    
    if (sourceEntity && targetEntity && sourceEntity.type === targetEntity.type) {
      // Merge logic
      targetEntity.confidence = Math.max(sourceEntity.confidence, targetEntity.confidence);
      targetEntity.metadata.relationships.push(sourceEntityId);
      targetEntity.validationState = 'merged';
      
      // Visual merge animation
      if (groupRef.current) {
        const sourceMesh = groupRef.current.getObjectByName(sourceEntityId);
        const targetMesh = groupRef.current.getObjectByName(targetEntityId);
        
        if (sourceMesh && targetMesh) {
          gsap.to(sourceMesh.position, {
            duration: 1,
            x: targetMesh.position.x,
            y: targetMesh.position.y,
            z: targetMesh.position.z,
            ease: 'power2.inOut',
            onComplete: () => {
              sourceMesh.visible = false;
              // Animate target growth
              gsap.to(targetMesh.scale, {
                duration: 0.5,
                x: 1.2,
                y: 1.2,
                z: 1.2,
                ease: 'back.out(1.7)'
              });
            }
          });
        }
      }
    }
  }, [extractedEntities]);

  const handleEntityInspect = useCallback((entityId: string) => {
    const entity = extractedEntities.find(e => e.id === entityId);
    if (entity) {
      console.log('🔍 Inspecting entity:', {
        id: entityId,
        type: entity.type,
        confidence: entity.confidence,
        validationState: entity.validationState,
        businessValue: entity.businessValue,
        extractionRules: entity.extractionRules,
        metadata: entity.metadata
      });
      
      // Could trigger detailed inspection modal
    }
  }, [extractedEntities]);

  const handleEntityContextMenu = useCallback((entityId: string) => {
    const entity = extractedEntities.find(e => e.id === entityId);
    if (entity) {
      console.log('📋 Entity context menu:', {
        entity: entityId,
        actions: [
          'Validate',
          'Reject', 
          'Merge with selected',
          'View relationships',
          'Export data',
          'Edit metadata'
        ]
      });
    }
  }, [extractedEntities]);

  // Filter handling
  const applyFilter = useCallback((newFilter: Partial<typeof filterState>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);

  const shouldShowEntity = useCallback((entity: any) => {
    // Apply entity type filter
    if (filterState.entityTypes.size > 0 && !filterState.entityTypes.has(entity.type)) {
      return false;
    }
    
    // Apply validation state filter
    if (filterState.validationStates.size > 0 && !filterState.validationStates.has(entity.validationState)) {
      return false;
    }
    
    // Apply confidence threshold
    if (entity.confidence < filterState.confidenceThreshold) {
      return false;
    }
    
    // Apply business value filter
    if (filterState.businessValueFilter !== 'all' && entity.businessValue !== filterState.businessValueFilter) {
      return false;
    }
    
    return true;
  }, [filterState]);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const sectionStart = 0.40;
    const sectionEnd = 0.60;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));

    // Update extraction progress
    setExtractionProgress(localProgress);

    // Animate each entity
    extractedEntities.forEach((entity, index) => {
      const entityMesh = groupRef.current?.getObjectByName(entity.id);
      if (!entityMesh) return;

      // Show/hide based on filters
      const shouldShow = shouldShowEntity(entity);
      entityMesh.visible = shouldShow;
      
      if (!shouldShow) return;

      // Individual animation timing
      const entityProgress = Math.min(1, Math.max(0, (localProgress - entity.delay / 10) / 0.8));
      
      if (entityProgress > 0) {
        // Lerp from start to end position
        const currentPos = new THREE.Vector3().lerpVectors(
          entity.startPos,
          entity.endPos,
          entityProgress
        );
        
        entityMesh.position.copy(currentPos);
        
        // Add floating motion
        entityMesh.position.y += Math.sin(time * 1.5 + entity.delay) * 0.3;
        
        // Scale animation
        const scale = 0.3 + (entityProgress * 0.7);
        if (!selectedEntities.has(entity.id) && hoveredEntity !== entity.id) {
          entityMesh.scale.setScalar(scale);
        }
        
        // Rotation animation
        entityMesh.rotation.y = time * 0.5 + entity.delay;
        
        // Validation state effects
        if (entity.validationState === 'validated') {
          const pulse = 1 + Math.sin(time * 2) * 0.1;
          entityMesh.scale.multiplyScalar(pulse);
        }
        
        // Selection state effects
        if (selectedEntities.has(entity.id)) {
          const pulseScale = 1.2 + Math.sin(time * 3) * 0.1;
          entityMesh.scale.setScalar(pulseScale);
        }
      }
    });

    // Extraction core animation
    if (extractionCoreRef.current) {
      const pulse = 1 + Math.sin(time * 3) * 0.1;
      extractionCoreRef.current.scale.setScalar(pulse);
      extractionCoreRef.current.rotation.y = time * 0.2;
    }
  });

  // Show only during entity extraction section
  const sectionStart = 0.40;
  const sectionEnd = 0.60;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef}>
      {/* Central extraction core */}
      <group position={[0, 0, 0]}>
        <mesh
          ref={extractionCoreRef}
          name="extraction-core"
          onClick={() => console.log('🧠 Extraction core clicked')}
        >
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial 
            color="#FF6B6B"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        
        {/* Extraction beams */}
        {entityTypeDefinitions.map((type, index) => {
          const angle = (index / entityTypeDefinitions.length) * Math.PI * 2;
          const x = Math.cos(angle) * 8;
          const z = Math.sin(angle) * 8;
          
          return (
            <mesh key={type.type} position={[x/2, 0, z/2]} lookAt={[x, 2 + index * 2, z]}>
              <cylinderGeometry args={[0.1, 0.05, 8, 8]} />
              <meshBasicMaterial 
                color={type.color}
                transparent
                opacity={0.6}
              />
            </mesh>
          );
        })}
      </group>

      {/* Individual entities */}
      {entityInteractables.map((entity, index) => (
        <group 
          key={entity.id}
          name={entity.id}
          position={entity.startPos}
          onPointerEnter={() => handleEntityHover(entity.id, true)}
          onPointerLeave={() => handleEntityHover(entity.id, false)}
          onClick={(e) => {
            e.stopPropagation();
            handleEntitySelect(entity.id, e.nativeEvent.ctrlKey);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleEntityInspect(entity.id);
          }}
          onContextMenu={(e) => {
            e.stopPropagation();
            handleEntityContextMenu(entity.id);
          }}
        >
          {/* Entity background */}
          <mesh>
            <sphereGeometry args={[0.8, 8, 8]} />
            <meshBasicMaterial 
              color={entity.color}
              transparent
              opacity={0.8}
            />
          </mesh>
          
          {/* Entity symbol */}
          <Text
            text={entity.symbol}
            fontSize={0.6}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.9]}
          >
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </Text>
          
          {/* Confidence indicator */}
          <mesh position={[0, -1.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, entity.confidence * 1.5, 6]} />
            <meshBasicMaterial
              color={entity.confidence > 0.8 ? '#10B981' : entity.confidence > 0.6 ? '#F59E0B' : '#EF4444'}
              transparent
              opacity={0.8}
            />
          </mesh>
          
          {/* Validation state indicator */}
          <mesh position={[1, 0.8, 0]}>
            <sphereGeometry args={[0.2, 6, 6]} />
            <meshBasicMaterial
              color={
                entity.validationState === 'validated' ? '#10B981' :
                entity.validationState === 'rejected' ? '#EF4444' :
                entity.validationState === 'merged' ? '#8B5CF6' : '#6B7280'
              }
              transparent
              opacity={0.9}
            />
          </mesh>
          
          {/* Selection indicator */}
          {selectedEntities.has(entity.id) && (
            <mesh>
              <ringGeometry args={[1.2, 1.5, 16]} />
              <meshBasicMaterial
                color="#00FFFF"
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          
          {/* Hover glow */}
          {hoveredEntity === entity.id && (
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[1.2, 8, 8]} />
              <meshBasicMaterial 
                color={entity.color}
                transparent
                opacity={0.3}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}
          
          {/* Relationship connections */}
          {entity.metadata.relationships.map((relatedId: string, relIndex: number) => {
            const relatedEntity = extractedEntities.find(e => e.id === relatedId);
            if (!relatedEntity) return null;
            
            return (
              <line key={relIndex}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([
                      0, 0, 0,
                      relatedEntity.currentPos.x - entity.currentPos.x,
                      relatedEntity.currentPos.y - entity.currentPos.y,
                      relatedEntity.currentPos.z - entity.currentPos.z
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#64FFDA" transparent opacity={0.4} />
              </line>
            );
          })}
        </group>
      ))}

      {/* Entity category labels */}
      {entityTypeDefinitions.map((type, index) => {
        const angle = (index / entityTypeDefinitions.length) * Math.PI * 2;
        const radius = 16;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`label-${type.type}`} position={[x, 4 + index * 2, z]}>
            <Text
              text={type.type}
              fontSize={1.5}
              color={type.color}
              anchorX="center"
              anchorY="middle"
            >
              <meshBasicMaterial color={type.color} toneMapped={false} />
            </Text>
            
            {/* Entity count indicator */}
            <Text
              text={`${type.count} EXTRACTED`}
              fontSize={0.6}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              position={[0, -1.5, 0]}
            >
              <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
            </Text>
          </group>
        );
      })}

      {/* Scene title */}
      <Text
        text="EXTRACCIÓN DE ENTIDADES"
        fontSize={2}
        color="#FF6B6B"
        anchorX="center"
        anchorY="middle"
        position={[0, 12, 0]}
      >
        <meshBasicMaterial color="#FF6B6B" toneMapped={false} />
      </Text>

      {/* Extraction progress indicator */}
      <Text
        text={`PROGRESO: ${Math.round(extractionProgress * 100)}%`}
        fontSize={0.8}
        color="#00FFFF"
        anchorX="center"
        anchorY="middle"
        position={[0, 10, 0]}
      >
        <meshBasicMaterial color="#00FFFF" toneMapped={false} />
      </Text>

      {/* Validation mode indicator */}
      {validationMode && (
        <Text
          text="MODO VALIDACIÓN ACTIVO"
          fontSize={0.8}
          color="#F59E0B"
          anchorX="center"
          anchorY="middle"
          position={[0, 8, 0]}
        >
          <meshBasicMaterial color="#F59E0B" toneMapped={false} />
        </Text>
      )}

      {/* Selection info */}
      {selectedEntities.size > 0 && (
        <Text
          text={`${selectedEntities.size} ENTIDAD${selectedEntities.size > 1 ? 'ES' : ''} SELECCIONADA${selectedEntities.size > 1 ? 'S' : ''}`}
          fontSize={0.6}
          color="#00FF00"
          anchorX="center"
          anchorY="middle"
          position={[0, 6, 0]}
        >
          <meshBasicMaterial color="#00FF00" toneMapped={false} />
        </Text>
      )}

      {/* Filter active indicator */}
      {(filterState.entityTypes.size > 0 || 
        filterState.validationStates.size > 0 ||
        filterState.confidenceThreshold > 0.5 || 
        filterState.businessValueFilter !== 'all') && (
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

      {/* Validation controls (when in validation mode) */}
      {validationMode && selectedEntities.size > 0 && (
        <group position={[15, 8, 0]}>
          {/* Validate button */}
          <mesh
            position={[0, 2, 0]}
            onClick={() => {
              selectedEntities.forEach(entityId => {
                handleEntityValidate(entityId, 'validated');
              });
            }}
          >
            <boxGeometry args={[3, 1, 0.5]} />
            <meshBasicMaterial color="#10B981" transparent opacity={0.8} />
          </mesh>
          
          <Text
            text="VALIDAR"
            fontSize={0.6}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            position={[0, 2, 0.3]}
          >
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </Text>
          
          {/* Reject button */}
          <mesh
            position={[0, 0, 0]}
            onClick={() => {
              selectedEntities.forEach(entityId => {
                handleEntityValidate(entityId, 'rejected');
              });
            }}
          >
            <boxGeometry args={[3, 1, 0.5]} />
            <meshBasicMaterial color="#EF4444" transparent opacity={0.8} />
          </mesh>
          
          <Text
            text="RECHAZAR"
            fontSize={0.6}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.3]}
          >
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </Text>
        </group>
      )}
    </group>
  );
};

export default InteractiveEntityExtractionScene;