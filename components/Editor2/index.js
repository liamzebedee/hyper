import React, { useEffect, useState } from 'react';

// const { Stage, Layer, Star, Text } = require('react-konva');
import("konva")
// const { Stage, Layer, Star, Text } = import('react-konva');
const { Layer, Star, Text } = require('react-konva');
import { Stage } from './Stage'
console.log(Konva)


const Editor = () => {
    const [stars, setStars] = useState(generateShapes());
    
    function generateShapes() {
        return [...Array(10)].map((_, i) => ({
            id: i.toString(),
            x: Math.random() * 400,
            y: Math.random() * 700,
            rotation: Math.random() * 180,
            isDragging: false,
        }));
    }


    const handleDragStart = (e) => {
        const id = e.target.id();
        setStars(
            stars.map((star) => {
                return {
                    ...star,
                    isDragging: star.id === id,
                };
            })
        );
    };
    const handleDragEnd = (e) => {
        setStars(
            stars.map((star) => {
                return {
                    ...star,
                    isDragging: false,
                };
            })
        );
    };
    

    return <div>
        <Stage width={700} height={700}>
            <Layer>
                <Text text="Try to drag a star" />
                {stars.map((star) => (
                    <Star
                        key={star.id}
                        id={star.id}
                        x={star.x}
                        y={star.y}
                        numPoints={5}
                        innerRadius={20}
                        outerRadius={40}
                        fill="#89b717"
                        opacity={0.8}
                        draggable
                        rotation={star.rotation}
                        shadowColor="black"
                        shadowBlur={10}
                        shadowOpacity={0.6}
                        shadowOffsetX={star.isDragging ? 10 : 5}
                        shadowOffsetY={star.isDragging ? 10 : 5}
                        scaleX={star.isDragging ? 1.2 : 1}
                        scaleY={star.isDragging ? 1.2 : 1}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </Layer>
        </Stage>
    </div>
};

export default Editor