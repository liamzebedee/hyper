import React, { useEffect, useRef, useState } from 'react';

// const { Stage, Layer, Star, Text } = require('react-konva');
import("konva")
// const { Stage, Layer, Star, Text } = import('react-konva');
const { Layer, Star, Text, Image, Rect } = require('react-konva');
import { Stage } from './Stage'
import useImage from 'use-image'
const IMAGE_URI_SVG = "https://storage.opensea.io/files/7027a367a2d7923c6b86845d4be3a143.svg"
const IMAGE_URI = "https://upload.wikimedia.org/wikipedia/en/c/cc/Wojak_cropped.jpg"


function downloadURI(uri, name) {
    var link = document.createElement('a');
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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
    

    const [image] = useImage(IMAGE_URI, 'anonymous');
    
    const stageRef = useRef()

    function exportCanvas() {
        const uri = stageRef.current.toDataURL();
        console.log(uri);

        downloadURI(uri, 'meme.jpg')
        // we also can save uri as file
        // but in the demo on Konva website it will not work
        // because of iframe restrictions
        // but feel free to use it in your apps:
        // downloadURI(uri, 'stage.png');
    }

    return <div>
        <button onClick={exportCanvas}>Export</button>
        <Stage ref={stageRef} width={700} height={700}>
            <Layer>
                <Rect x={0} y={0} width={700} height={700} fill="white">
                </Rect>

                <Text text="Try to drag a star" />

                <Image 
                    crossOrigin
                    image={image} 
                    draggable />
                
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