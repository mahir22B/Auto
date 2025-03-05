import React, { useState, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { setEdges } = useReactFlow();
  

  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handle delayed show/hide of delete button
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isHovered) {
      timeoutId = setTimeout(() => {
        setShowDelete(true);
      }, 300); // 0.3s delay
    } else {
      setShowDelete(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isHovered]);

  const strokeWidth = 5;

  return (
    <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {/* Invisible wider path for better hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={strokeWidth}
        stroke="transparent"
        className="react-flow__edge-interaction"
      />
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#94a3b8',
          animation: 'flow 8s linear infinite',
          strokeDasharray: '5,5'
        }}
      />
      <EdgeLabelRenderer>
        {showDelete && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
              onClick={() => {
                setEdges((edges) => edges.filter((edge) => edge.id !== id));
              }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </g>
  );
};

export default CustomEdge;