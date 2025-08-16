'use client';

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useInteractionManager } from '@/hooks/useInteractionManager';
import { useSceneInteraction } from '@/contexts/InteractionContext';
import {
  Interactive3DObject,
  InteractionCapabilities,
  InteractionEventHandlers,
  SceneInteractionConfig
} from '@/types/interactions';

interface InteractiveQueryResponseSceneProps {
  scrollProgress: number;
}

interface QueryOrb {
  id: string;
  position: THREE.Vector3;
  query: string;
  type: 'factual' | 'analytical' | 'comparative' | 'predictive';
  complexity: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: {
    timestamp: Date;
    userId: string;
    priority: number;
    expectedResponseTime: number;
    actualResponseTime?: number;
    confidence?: number;
  };
}

interface EvidenceNode {
  id: string;
  position: THREE.Vector3;
  type: 'SOURCE' | 'ENTITY' | 'PROCESS' | 'RELATION' | 'INSIGHT';
  color: string;
  content: string;
  relevanceScore: number;
  activated: boolean;
  metadata: {
    sourceDocument: string;
    extractedText: string;
    context: string;
    reliability: number;
    timestamp: Date;
    citations: string[];
  };
}

interface ResponseComponent {
  id: string;
  text: string;
  position: THREE.Vector3;
  color: string;
  type: 'fact' | 'analysis' | 'conclusion' | 'recommendation';
  confidence: number;
  evidence: string[];
  assembled: boolean;
}

const InteractiveQueryResponseScene: React.FC<InteractiveQueryResponseSceneProps> = ({ 
  scrollProgress 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const queryOrbRef = useRef<THREE.Mesh>(null);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [queryMode, setQueryMode] = useState<'explore' | 'trace' | 'analyze' | 'compare'>('explore');
  const [showEvidence, setShowEvidence] = useState(true);
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [traceMode, setTraceMode] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryOrb[]>([]);
  const [responseQuality, setResponseQuality] = useState<'detailed' | 'summary' | 'brief'>('detailed');

  // Interaction capabilities
  const elementCapabilities: InteractionCapabilities = {
    hoverable: true,
    clickable: true,
    draggable: false,
    selectable: true,
    focusable: true,
    rotatable: false,
    scalable: false,
    deletable: false,
    duplicable: false,
    editable: false,
    contextMenu: true,
    multiSelectable: true,
    keyboardNavigable: true
  };


  // Scene interaction management (same as other components)
  const {
    activateScene,
    deactivateScene,
    selectInScene,
    isSceneActive,
    sceneSelections
  } = useSceneInteraction('query-response');

  // Query path through the knowledge network
  const queryPath = useMemo(() => [
    new THREE.Vector3(-15, 5, 0),    // Query entry point
    new THREE.Vector3(-8, 3, -5),    // First knowledge node
    new THREE.Vector3(-2, -1, 8),    // Entity connection
    new THREE.Vector3(5, 4, -3),     // Process node
    new THREE.Vector3(8, -2, 6),     // Relationship hub
    new THREE.Vector3(12, 1, -4),    // Core knowledge
    new THREE.Vector3(15, -3, 0),    // Answer assembly point
  ], []);

  // Enhanced evidence nodes
  const evidenceNodes = useMemo((): EvidenceNode[] => [
    { 
      id: 'evidence-source-1',
      position: new THREE.Vector3(-8, 3, -5), 
      type: 'SOURCE', 
      color: '#4ECDC4',
      content: 'DOC_REF_1',
      relevanceScore: 0.95,
      activated: false,
      metadata: {
        sourceDocument: 'Business Process Manual v2.1',
        extractedText: 'Customer onboarding process requires three validation steps...',
        context: 'Section 4.2 - Customer Management',
        reliability: 0.92,
        timestamp: new Date('2024-01-15'),
        citations: ['BP-001', 'CM-042']
      }
    },
    { 
      id: 'evidence-entity-1',
      position: new THREE.Vector3(-2, -1, 8), 
      type: 'ENTITY', 
      color: '#45B7D1',
      content: 'PERSON_X',
      relevanceScore: 0.87,
      activated: false,
      metadata: {
        sourceDocument: 'Organizational Chart 2024',
        extractedText: 'John Smith, Senior Process Manager, responsible for...',
        context: 'Management Structure',
        reliability: 0.96,
        timestamp: new Date('2024-02-01'),
        citations: ['ORG-015', 'HR-089']
      }
    },
    { 
      id: 'evidence-process-1',
      position: new THREE.Vector3(5, 4, -3), 
      type: 'PROCESS', 
      color: '#F9CA24',
      content: 'WORKFLOW_Y',
      relevanceScore: 0.91,
      activated: false,
      metadata: {
        sourceDocument: 'Workflow Documentation v3.0',
        extractedText: 'Approval workflow consists of initial review, technical assessment...',
        context: 'Process Flow Diagrams',
        reliability: 0.89,
        timestamp: new Date('2024-01-20'),
        citations: ['WF-023', 'PD-067']
      }
    },
    { 
      id: 'evidence-relation-1',
      position: new THREE.Vector3(8, -2, 6), 
      type: 'RELATION', 
      color: '#FF6B6B',
      content: 'CONNECTS_TO',
      relevanceScore: 0.78,
      activated: false,
      metadata: {
        sourceDocument: 'System Integration Map',
        extractedText: 'CRM system interfaces with the ERP module through...',
        context: 'Technical Architecture',
        reliability: 0.84,
        timestamp: new Date('2024-01-10'),
        citations: ['SIM-001', 'TA-034']
      }
    },
    { 
      id: 'evidence-insight-1',
      position: new THREE.Vector3(12, 1, -4), 
      type: 'INSIGHT', 
      color: '#A855F7',
      content: 'CONCLUSION',
      relevanceScore: 0.93,
      activated: false,
      metadata: {
        sourceDocument: 'Analysis Report Q1 2024',
        extractedText: 'Based on performance metrics, the current process shows...',
        context: 'Performance Analysis',
        reliability: 0.91,
        timestamp: new Date('2024-03-01'),
        citations: ['AR-012', 'PM-156']
      }
    }
  ], []);

  // Enhanced answer components
  const answerComponents = useMemo((): ResponseComponent[] => [
    { 
      id: 'response-fact-1',
      text: 'BASED ON', 
      position: new THREE.Vector3(18, 2, 0), 
      color: '#64FFDA',
      type: 'fact',
      confidence: 0.96,
      evidence: ['evidence-source-1', 'evidence-entity-1'],
      assembled: false
    },
    { 
      id: 'response-fact-2',
      text: 'DOCUMENT', 
      position: new THREE.Vector3(20, 1, 0), 
      color: '#4ECDC4',
      type: 'fact',
      confidence: 0.92,
      evidence: ['evidence-source-1'],
      assembled: false
    },
    { 
      id: 'response-analysis-1',
      text: 'ANALYSIS', 
      position: new THREE.Vector3(22, 0, 0), 
      color: '#45B7D1',
      type: 'analysis',
      confidence: 0.89,
      evidence: ['evidence-process-1', 'evidence-relation-1'],
      assembled: false
    },
    { 
      id: 'response-fact-3',
      text: 'RESULT:', 
      position: new THREE.Vector3(24, -1, 0), 
      color: '#F9CA24',
      type: 'fact',
      confidence: 0.94,
      evidence: ['evidence-insight-1'],
      assembled: false
    },
    { 
      id: 'response-conclusion-1',
      text: 'PRECISE', 
      position: new THREE.Vector3(26, -2, 0), 
      color: '#FF6B6B',
      type: 'conclusion',
      confidence: 0.87,
      evidence: ['evidence-insight-1', 'evidence-process-1'],
      assembled: false
    },
    { 
      id: 'response-conclusion-2',
      text: 'ANSWER', 
      position: new THREE.Vector3(28, -3, 0), 
      color: '#A855F7',
      type: 'conclusion',
      confidence: 0.91,
      evidence: ['evidence-insight-1'],
      assembled: false
    }
  ], []);

  // Sample queries
  const sampleQueries = useMemo((): QueryOrb[] => [
    {
      id: 'query-1',
      position: new THREE.Vector3(-15, 5, 0),
      query: 'What is the customer onboarding process?',
      type: 'factual',
      complexity: 3,
      status: 'completed',
      metadata: {
        timestamp: new Date(),
        userId: 'user-123',
        priority: 2,
        expectedResponseTime: 5000,
        actualResponseTime: 4200,
        confidence: 0.91
      }
    },
    {
      id: 'query-2',
      position: new THREE.Vector3(-12, 8, 2),
      query: 'How does the approval workflow impact processing time?',
      type: 'analytical',
      complexity: 5,
      status: 'processing',
      metadata: {
        timestamp: new Date(),
        userId: 'user-124',
        priority: 1,
        expectedResponseTime: 8000
      }
    }
  ], []);


  // Scene activation based on scroll progress (like other components)
  useEffect(() => {
    const sectionStart = 0.80; // Starts after text appears
    const sectionEnd = 1.0;
    const isInSection = scrollProgress >= sectionStart && scrollProgress <= sectionEnd;
    
    if (isInSection && !isSceneActive) {
      activateScene();
    } else if (!isInSection && isSceneActive) {
      deactivateScene();
    }
  }, [scrollProgress, isSceneActive, activateScene, deactivateScene]);

  // Enhanced animation loop
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Calculate animation progress
    const sectionStart = 0.80;
    const sectionEnd = 1.0;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));
    
    // Query orb movement along path
    if (queryOrbRef.current && localProgress > 0) {
      const pathProgress = localProgress * (queryPath.length - 1);
      const currentSegment = Math.floor(pathProgress);
      const segmentProgress = pathProgress - currentSegment;
      
      if (currentSegment < queryPath.length - 1) {
        const currentPos = new THREE.Vector3().lerpVectors(
          queryPath[currentSegment],
          queryPath[currentSegment + 1],
          segmentProgress
        );
        queryOrbRef.current.position.copy(currentPos);
        
        // Enhanced floating motion based on query status
        const floatIntensity = selectedQuery ? 0.3 : 0.2;
        queryOrbRef.current.position.y += Math.sin(time * 4) * floatIntensity;
        
        // Enhanced pulsing based on processing state
        const pulseScale = 1 + Math.sin(time * 6) * 0.3;
        queryOrbRef.current.scale.setScalar(pulseScale);
      }
    }
    
    // Animate evidence nodes with enhanced interactions
    groupRef.current.children.forEach((child, index) => {
      if (child.userData.isEvidence) {
        const evidenceId = child.userData.evidenceId;
        const evidence = evidenceNodes.find(e => e.id === evidenceId);
        if (!evidence) return;

        const activationTime = (index + 1) / evidenceNodes.length;
        const isActive = localProgress > activationTime || evidence.activated;
        
        if (isActive) {
          // Enhanced intensity based on interaction state
          let intensity = 0.8 + Math.sin(time * 3 + index) * 0.4;
          
          if (hoveredElement === evidenceId) {
            intensity = 1 + Math.sin(time * 8) * 0.3;
          }
          
          if (selectedEvidence.includes(evidenceId)) {
            intensity = 1 + Math.sin(time * 6) * 0.2;
          }
          
          if (traceMode && selectedEvidence.includes(evidenceId)) {
            intensity = 1 + Math.sin(time * 10) * 0.4;
          }
          
          child.traverse((obj) => {
            if (obj.material) {
              obj.material.opacity = intensity;
            }
          });
          
          // Enhanced scaling with relevance score
          let scale = evidence.relevanceScore;
          if (hoveredElement === evidenceId) {
            scale *= 1.3 + Math.sin(time * 8) * 0.1;
          }
          if (selectedEvidence.includes(evidenceId)) {
            scale *= 1.2 + Math.sin(time * 4) * 0.05;
          }
          
          child.scale.setScalar(scale);
          
          // Floating motion based on reliability
          const floatSpeed = evidence.metadata.reliability * 2;
          const floatIntensity = selectedEvidence.includes(evidenceId) ? 0.3 : 0.2;
          child.position.y += Math.sin(time * floatSpeed + index) * floatIntensity;
        } else {
          child.scale.setScalar(0.1);
        }
      }
      
      if (child.userData.isAnswerComponent) {
        const componentId = child.userData.componentId;
        const component = answerComponents.find(c => c.id === componentId);
        if (!component) return;

        const componentIndex = answerComponents.findIndex(c => c.id === componentId);
        const appearTime = 0.6 + (componentIndex * 0.05);
        const componentProgress = Math.min(1, Math.max(0, (localProgress - appearTime) / 0.3));
        
        if (componentProgress > 0) {
          // Scale based on confidence
          let scale = componentProgress * component.confidence;
          
          if (hoveredElement === componentId) {
            scale *= 1.2 + Math.sin(time * 6) * 0.1;
          }
          
          child.scale.setScalar(scale);
          
          child.traverse((obj) => {
            if (obj.material) {
              obj.material.opacity = componentProgress * component.confidence;
            }
          });
          
          // Gentle floating with confidence-based speed
          const floatSpeed = component.confidence * 1.5;
          child.position.y += Math.sin(time * floatSpeed + componentIndex) * 0.1;
        }
      }
    });
  });

  // Interaction utility functions
  const rerunQuery = useCallback((queryId: string) => {
    const query = sampleQueries.find(q => q.id === queryId);
    if (query) {
      query.status = 'processing';
      console.log('Re-running query:', query.query);
      
      // Reset evidence activation
      evidenceNodes.forEach(evidence => {
        evidence.activated = false;
      });
      
      // Simulate processing
      setTimeout(() => {
        query.status = 'completed';
        query.metadata.actualResponseTime = Math.random() * 5000 + 2000;
        query.metadata.confidence = 0.8 + Math.random() * 0.2;
      }, 3000);
    }
  }, [sampleQueries, evidenceNodes]);

  const analyzeResponse = useCallback((queryId: string) => {
    const query = sampleQueries.find(q => q.id === queryId);
    if (query) {
      console.log('Analyzing response for:', query.query);
      setQueryMode('analyze');
      setTraceMode(true);
    }
  }, [sampleQueries]);

  const traceEvidence = useCallback((queryId: string) => {
    setTraceMode(true);
    setQueryMode('trace');
    console.log('Tracing evidence for query:', queryId);
  }, []);

  const exportResults = useCallback((queryId: string) => {
    const query = sampleQueries.find(q => q.id === queryId);
    if (query) {
      const results = {
        query: query.query,
        response: answerComponents.filter(c => c.assembled).map(c => c.text).join(' '),
        evidence: selectedEvidence.map(id => evidenceNodes.find(e => e.id === id)),
        metadata: query.metadata
      };
      console.log('Exporting results:', results);
    }
  }, [sampleQueries, answerComponents, selectedEvidence, evidenceNodes]);

  const viewEvidenceSource = useCallback((evidenceId: string) => {
    const evidence = evidenceNodes.find(e => e.id === evidenceId);
    if (evidence) {
      console.log('Viewing source for:', evidence.metadata.sourceDocument);
    }
  }, [evidenceNodes]);

  const validateEvidence = useCallback((evidenceId: string) => {
    const evidence = evidenceNodes.find(e => e.id === evidenceId);
    if (evidence) {
      evidence.metadata.reliability = Math.min(1, evidence.metadata.reliability + 0.1);
      console.log('Validated evidence:', evidenceId);
    }
  }, [evidenceNodes]);

  const findRelatedEvidence = useCallback((evidenceId: string) => {
    const evidence = evidenceNodes.find(e => e.id === evidenceId);
    if (evidence) {
      const relatedEvidence = evidenceNodes.filter(e => 
        e.id !== evidenceId && 
        e.metadata.sourceDocument === evidence.metadata.sourceDocument
      );
      console.log('Related evidence:', relatedEvidence);
      setSelectedEvidence(relatedEvidence.map(e => e.id));
    }
  }, [evidenceNodes]);

  const citeEvidence = useCallback((evidenceId: string) => {
    const evidence = evidenceNodes.find(e => e.id === evidenceId);
    if (evidence) {
      console.log('Adding citation for:', evidence.metadata.citations);
    }
  }, [evidenceNodes]);

  // Visibility check
  const sectionStart = 0.80;
  const sectionEnd = 1.0;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef}>
      {/* Enhanced Query Orb */}
      <mesh ref={queryOrbRef} position={queryPath[0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={selectedQuery ? '#FFFF00' : '#00FFFF'}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Query orb glow */}
      <mesh position={queryOrbRef.current?.position || queryPath[0]}>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshBasicMaterial 
          color="#00FFFF"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Enhanced Query Path */}
      {queryPath.slice(0, -1).map((point, index) => {
        const nextPoint = queryPath[index + 1];
        const midpoint = new THREE.Vector3().addVectors(point, nextPoint).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(nextPoint, point);
        const distance = direction.length();
        
        return (
          <mesh key={`path-${index}`} position={midpoint} lookAt={nextPoint}>
            <cylinderGeometry args={[0.05, 0.05, distance, 8]} />
            <meshBasicMaterial 
              color={traceMode ? '#FFFF00' : '#00FFFF'}
              transparent
              opacity={traceMode ? 0.8 : 0.3}
            />
          </mesh>
        );
      })}

      {/* Enhanced Evidence Nodes */}
      {evidenceNodes.map((node, index) => {
        const isFiltered = evidenceFilter !== 'all' && 
          ((evidenceFilter === 'high' && node.relevanceScore < 0.8) ||
           (evidenceFilter === 'medium' && node.relevanceScore < 0.6) ||
           (evidenceFilter === 'low' && node.relevanceScore < 0.4));
        
        if (isFiltered) return null;

        return (
          <group 
            key={`evidence-${index}`}
            position={node.position}
            userData={{ isEvidence: true, evidenceId: node.id }}
          >
            {/* Selection indicator */}
            {selectedEvidence.includes(node.id) && (
              <mesh position={[0, 0, 0]}>
                <ringGeometry args={[1.5, 2, 16]} />
                <meshBasicMaterial 
                  color="#FFFF00"
                  transparent
                  opacity={0.8}
                />
              </mesh>
            )}
            
            {/* Trace indicator */}
            {traceMode && selectedEvidence.includes(node.id) && (
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[2.5, 8, 8]} />
                <meshBasicMaterial 
                  color="#FFFF00"
                  transparent
                  opacity={0.2}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            )}
            
            {/* Evidence node sphere */}
            <mesh>
              <sphereGeometry args={[1.2, 12, 12]} />
              <meshBasicMaterial 
                color={hoveredElement === node.id ? '#FFFFFF' : node.color}
                transparent
                opacity={node.activated ? 0.8 : 0.1}
              />
            </mesh>
            
            {/* Relevance score indicator */}
            <mesh position={[1.5, 1.5, 0]} scale={[node.relevanceScore, node.relevanceScore, 1]}>
              <sphereGeometry args={[0.2, 6, 6]} />
              <meshBasicMaterial 
                color={node.relevanceScore > 0.8 ? '#00FF00' : 
                      node.relevanceScore > 0.6 ? '#FFFF00' : '#FF6600'}
                transparent
                opacity={0.9}
              />
            </mesh>
            
            {/* Reliability indicator */}
            <mesh position={[-1.5, 1.5, 0]} scale={[node.metadata.reliability, node.metadata.reliability, 1]}>
              <boxGeometry args={[0.3, 0.3, 0.1]} />
              <meshBasicMaterial 
                color={node.metadata.reliability > 0.9 ? '#00FF00' : 
                      node.metadata.reliability > 0.7 ? '#FFFF00' : '#FF6600'}
                transparent
                opacity={0.8}
              />
            </mesh>
            
            {/* Evidence glow */}
            <mesh>
              <sphereGeometry args={[2, 8, 8]} />
              <meshBasicMaterial 
                color={node.color}
                transparent
                opacity={0.1}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            
            {/* Evidence label */}
            <Text
              text={node.content}
              fontSize={0.8}
              color={node.color}
              anchorX="center"
              anchorY="middle"
              position={[0, 2, 0]}
            >
              <meshBasicMaterial 
                color={node.color}
                toneMapped={false}
              />
            </Text>
          </group>
        );
      })}

      {/* Enhanced Answer Assembly Area */}
      <group position={[20, -5, 0]}>
        {/* Assembly platform */}
        <mesh>
          <cylinderGeometry args={[6, 6, 0.5, 16]} />
          <meshBasicMaterial 
            color="#333333"
            transparent
            opacity={0.3}
          />
        </mesh>
        
        {/* Quality indicator */}
        <mesh position={[0, 1, 0]}>
          <ringGeometry args={[5, 5.5, 16]} />
          <meshBasicMaterial 
            color={responseQuality === 'detailed' ? '#00FF00' : 
                  responseQuality === 'summary' ? '#FFFF00' : '#FF6600'}
            transparent
            opacity={0.6}
          />
        </mesh>
        
        {/* Enhanced Answer Components */}
        {answerComponents.map((component, index) => (
          <group 
            key={`answer-${index}`}
            position={[
              (index - 2.5) * 2,
              1 + index * 0.2,
              0
            ]}
            userData={{ isAnswerComponent: true, componentId: component.id }}
          >
            {/* Component background */}
            <mesh position={[0, 0, -0.1]}>
              <planeGeometry args={[1.8, 0.8]} />
              <meshBasicMaterial 
                color={component.color}
                transparent
                opacity={0.2}
              />
            </mesh>
            
            {/* Confidence indicator */}
            <mesh position={[1, 0.5, 0]} scale={[component.confidence, component.confidence, 1]}>
              <sphereGeometry args={[0.1, 6, 6]} />
              <meshBasicMaterial 
                color={component.confidence > 0.9 ? '#00FF00' : 
                      component.confidence > 0.7 ? '#FFFF00' : '#FF6600'}
                transparent
                opacity={0.9}
              />
            </mesh>
            
            <Text
              text={component.text}
              fontSize={1}
              color={component.color}
              anchorX="center"
              anchorY="middle"
            >
              <meshBasicMaterial 
                color={component.color}
                toneMapped={false}
              />
            </Text>
          </group>
        ))}
      </group>

      {/* Control Panel */}
      <Html position={[-30, 10, 0]} className="pointer-events-auto">
        <div className="bg-black bg-opacity-80 p-4 rounded text-white text-sm space-y-3 min-w-72">
          <div className="font-bold text-base">Query Response System</div>
          
          {/* Query Mode */}
          <div>
            <div className="mb-2">Mode:</div>
            <div className="grid grid-cols-2 gap-1">
              {['explore', 'trace', 'analyze', 'compare'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setQueryMode(mode as any)}
                  className={`px-2 py-1 rounded text-xs ${
                    queryMode === mode 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          
          {/* Evidence Filter */}
          <div>
            <div className="mb-2">Evidence Relevance:</div>
            <select 
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value as any)}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
            >
              <option value="all">All Evidence</option>
              <option value="high">High Relevance (&gt;80%)</option>
              <option value="medium">Medium Relevance (&gt;60%)</option>
              <option value="low">Low Relevance (&gt;40%)</option>
            </select>
          </div>
          
          {/* Response Quality */}
          <div>
            <div className="mb-2">Response Quality:</div>
            <div className="flex gap-1">
              {['detailed', 'summary', 'brief'].map(quality => (
                <button
                  key={quality}
                  onClick={() => setResponseQuality(quality as any)}
                  className={`px-2 py-1 rounded text-xs flex-1 ${
                    responseQuality === quality 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="space-y-1">
            <button
              onClick={() => setTraceMode(!traceMode)}
              className={`w-full px-2 py-1 rounded text-xs ${
                traceMode ? 'bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {traceMode ? 'Exit' : 'Start'} Evidence Tracing
            </button>
            
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className={`w-full px-2 py-1 rounded text-xs ${
                showEvidence ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {showEvidence ? 'Hide' : 'Show'} Evidence
            </button>
            
            {selectedQuery && (
              <button
                onClick={() => rerunQuery(selectedQuery)}
                className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs"
              >
                Re-run Query
              </button>
            )}
          </div>
        </div>
      </Html>

      {/* Evidence Details */}
      {hoveredElement && evidenceNodes.find(e => e.id === hoveredElement) && (
        <Html position={[30, 10, 0]} className="pointer-events-none">
          <div className="bg-black bg-opacity-90 p-3 rounded text-white text-sm max-w-sm">
            {(() => {
              const evidence = evidenceNodes.find(e => e.id === hoveredElement);
              return evidence ? (
                <>
                  <div className="font-bold mb-1">{evidence.type}: {evidence.content}</div>
                  <div>Relevance: {(evidence.relevanceScore * 100).toFixed(1)}%</div>
                  <div>Reliability: {(evidence.metadata.reliability * 100).toFixed(1)}%</div>
                  <div>Source: {evidence.metadata.sourceDocument}</div>
                  <div className="mt-2 text-xs text-gray-300">
                    {evidence.metadata.extractedText.substring(0, 100)}...
                  </div>
                  <div className="mt-1 text-xs">
                    Citations: {evidence.metadata.citations.join(', ')}
                  </div>
                </>
              ) : null;
            })()}
          </div>
        </Html>
      )}

      {/* Query Status */}
      {selectedQuery && (
        <Html position={[30, -10, 0]} className="pointer-events-auto">
          <div className="bg-black bg-opacity-80 p-3 rounded text-white text-sm">
            {(() => {
              const query = sampleQueries.find(q => q.id === selectedQuery);
              return query ? (
                <>
                  <div className="font-bold mb-2">Active Query</div>
                  <div className="text-xs mb-2">{query.query}</div>
                  <div>Status: {query.status}</div>
                  <div>Type: {query.type}</div>
                  <div>Complexity: {query.complexity}/5</div>
                  {query.metadata.confidence && (
                    <div>Confidence: {(query.metadata.confidence * 100).toFixed(1)}%</div>
                  )}
                  {query.metadata.actualResponseTime && (
                    <div>Response Time: {query.metadata.actualResponseTime.toFixed(0)}ms</div>
                  )}
                  <div className="mt-2 space-y-1">
                    <button
                      onClick={() => analyzeResponse(query.id)}
                      className="w-full px-2 py-1 bg-blue-500 hover:bg-blue-400 rounded text-xs"
                    >
                      Analyze Response
                    </button>
                    <button
                      onClick={() => exportResults(query.id)}
                      className="w-full px-2 py-1 bg-green-500 hover:bg-green-400 rounded text-xs"
                    >
                      Export Results
                    </button>
                  </div>
                </>
              ) : null;
            })()}
          </div>
        </Html>
      )}

      {/* User query input area */}
      <group position={[-20, 5, 0]}>
        <mesh>
          <boxGeometry args={[6, 3, 1]} />
          <meshBasicMaterial 
            color="#444444"
            transparent
            opacity={0.5}
          />
        </mesh>
        
        <Text
          text="USER QUERY"
          fontSize={1.2}
          color="#00FFFF"
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0.6]}
        >
          <meshBasicMaterial 
            color="#00FFFF"
            toneMapped={false}
          />
        </Text>
      </group>

      {/* Scene title */}
      <Text
        text="CONSULTA Y RESPUESTA"
        fontSize={2}
        color="#00FFFF"
        anchorX="center"
        anchorY="middle"
        position={[0, 8, 0]}
      >
        <meshBasicMaterial 
          color="#00FFFF"
          toneMapped={false}
        />
      </Text>

      {/* Enhanced Traceable Path Indicators */}
      {traceMode && evidenceNodes.map((node, index) => (
        <group key={`trace-${index}`} position={node.position}>
          <Text
            text={`TRACE ${index + 1}`}
            fontSize={0.5}
            color="#FFFF00"
            anchorX="center"
            anchorY="middle"
            position={[0, -2, 0]}
          >
            <meshBasicMaterial 
              color="#FFFF00"
              toneMapped={false}
            />
          </Text>
          
          {/* Trace connection lines */}
          {selectedEvidence.includes(node.id) && index < evidenceNodes.length - 1 && (
            <mesh lookAt={evidenceNodes[index + 1].position}>
              <cylinderGeometry args={[0.03, 0.03, node.position.distanceTo(evidenceNodes[index + 1].position), 8]} />
              <meshBasicMaterial 
                color="#FFFF00"
                transparent
                opacity={0.6}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

export default InteractiveQueryResponseScene;